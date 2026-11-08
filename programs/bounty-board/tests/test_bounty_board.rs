//! Full test suite for the bounty-board program.
//!
//! Covers every instruction and its edge cases, grouped by who is doing what:
//!   create   - a user posting a bounty (and locking the reward in escrow)
//!   accept   - a worker claiming a bounty
//!   submit   - the worker handing in their work
//!   approve  - the creator approving and paying the worker from escrow
//!   cancel   - the creator cancelling and getting a refund from escrow
//!   lifecycle- whole flows across several instructions and bounties
//!   rules    - the Bounty helper methods called directly (no blockchain)
//!
//! Run with:  anchor build && cargo test --test test_bounty_board
//!
//! Notes on how the tests work:
//! - A separate `fee_payer` wallet pays every transaction fee, so balance
//!   checks on the creator and worker are exact.
//! - The blockchain clock is set to a fixed time (NOW) so deadlines are
//!   predictable, and `set_time` moves it to test expiry.
//! - Failures are checked against the exact program error where possible,
//!   so a test fails if the transaction is rejected for the wrong reason.

use {
    anchor_lang::{
        prelude::{Clock, Pubkey},
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, Space, ToAccountMetas,
    },
    bounty_board::{
        bounty::{Bounty, BountyStatus},
        error::ErrorCode as BountyError,
    },
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// The blockchain time every test starts at (a fixed Unix timestamp)
const NOW: i64 = 1_800_000_000;
const DAY: i64 = 86_400;

/// Default reward used by `create_default` (0.5 SOL)
const REWARD: u64 = 500_000_000;

/// SOL given to the creator, worker and stranger at the start (2 SOL each)
const STARTING_BALANCE: u64 = 2_000_000_000;

/// Anchor numbers custom errors from 6000 upward, in the order of error.rs
const ANCHOR_ERROR_OFFSET: u32 = 6000;

const DEFAULT_TITLE: &str = "Design a logo";
const DEFAULT_DESCRIPTION: &str = "https://example.com/logo-brief";
const DEFAULT_SUBMISSION: &str = "https://github.com/worker/logo";

type TxResult = Result<(), String>;

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

/// The people in each test
struct Users {
    creator: Keypair,
    worker: Keypair,
    stranger: Keypair,
}

/// The simulated blockchain plus a wallet that pays all transaction fees
struct Chain {
    svm: LiteSVM,
    fee_payer: Keypair,
}

fn setup() -> (Chain, Users) {
    let mut svm = LiteSVM::new();

    let program_bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/bounty_board.so"
    ));
    svm.add_program(bounty_board::id(), program_bytes).unwrap();

    let fee_payer = Keypair::new();
    svm.airdrop(&fee_payer.pubkey(), 100_000_000_000).unwrap();

    let users = Users {
        creator: Keypair::new(),
        worker: Keypair::new(),
        stranger: Keypair::new(),
    };
    for wallet in [&users.creator, &users.worker, &users.stranger] {
        svm.airdrop(&wallet.pubkey(), STARTING_BALANCE).unwrap();
    }

    let mut chain = Chain { svm, fee_payer };
    chain.set_time(NOW);
    (chain, users)
}

/// Address of a bounty account: seeds are ["bounty", creator, bounty_id]
fn bounty_pda(creator: &Pubkey, bounty_id: u64) -> Pubkey {
    Pubkey::find_program_address(
        &[b"bounty", creator.as_ref(), &bounty_id.to_le_bytes()],
        &bounty_board::id(),
    )
    .0
}

impl Chain {
    // ---- Low-level helpers ----

    /// Sends one instruction signed by `signer` (fees paid by `fee_payer`).
    /// Returns Err with the failure details if the transaction is rejected.
    fn send(&mut self, instruction: Instruction, signer: &Keypair) -> TxResult {
        // Fresh blockhash so sending the same instruction twice is a real
        // second attempt, not rejected as a duplicate transaction
        self.svm.expire_blockhash();
        let blockhash = self.svm.latest_blockhash();

        let message = Message::new_with_blockhash(
            &[instruction],
            Some(&self.fee_payer.pubkey()),
            &blockhash,
        );

        // Fails here if `signer` isn't one of the accounts that must sign
        let transaction = VersionedTransaction::try_new(
            VersionedMessage::Legacy(message),
            &[&self.fee_payer, signer],
        )
        .map_err(|error| format!("could not sign transaction: {error:?}"))?;

        self.svm
            .send_transaction(transaction)
            .map(|_| ())
            .map_err(|failed| format!("{failed:?}"))
    }

    fn set_time(&mut self, unix_timestamp: i64) {
        let mut clock = self.svm.get_sysvar::<Clock>();
        clock.unix_timestamp = unix_timestamp;
        self.svm.set_sysvar::<Clock>(&clock);
    }

    fn balance(&self, address: &Pubkey) -> u64 {
        self.svm.get_balance(address).unwrap_or(0)
    }

    fn exists(&self, address: &Pubkey) -> bool {
        self.balance(address) > 0
    }

    /// Rent deposit a bounty account needs (paid by the creator on create)
    fn bounty_rent(&self) -> u64 {
        self.svm
            .minimum_balance_for_rent_exemption(8 + Bounty::INIT_SPACE)
    }

    fn read(&self, bounty: &Pubkey) -> Bounty {
        let account = self.svm.get_account(bounty).expect("bounty account missing");
        let mut data: &[u8] = &account.data;
        Bounty::try_deserialize(&mut data).expect("could not read bounty account")
    }

    // ---- One helper per program instruction ----

    /// create_bounty, letting the test choose the account address
    #[allow(clippy::too_many_arguments)]
    fn create_at(
        &mut self,
        address: Pubkey,
        creator: &Keypair,
        bounty_id: u64,
        title: &str,
        description: &str,
        reward: u64,
        deadline: i64,
    ) -> TxResult {
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::CreateBounty {
                bounty_id,
                title: title.to_string(),
                description_ref: description.to_string(),
                reward_lamports: reward,
                deadline,
            }
            .data(),
            bounty_board::accounts::CreateBounty {
                bounty: address,
                creator: creator.pubkey(),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        self.send(instruction, creator)
    }

    /// create_bounty at the correct address
    fn create(
        &mut self,
        creator: &Keypair,
        bounty_id: u64,
        title: &str,
        description: &str,
        reward: u64,
        deadline: i64,
    ) -> TxResult {
        let address = bounty_pda(&creator.pubkey(), bounty_id);
        self.create_at(address, creator, bounty_id, title, description, reward, deadline)
    }

    /// Creates bounty #1 with sensible defaults; panics if that fails
    fn create_default(&mut self, creator: &Keypair) -> Pubkey {
        self.create(
            creator,
            1,
            DEFAULT_TITLE,
            DEFAULT_DESCRIPTION,
            REWARD,
            NOW + 7 * DAY,
        )
        .expect("default create_bounty should succeed");
        bounty_pda(&creator.pubkey(), 1)
    }

    fn accept(&mut self, bounty: Pubkey, worker: &Keypair) -> TxResult {
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::AcceptBounty {}.data(),
            bounty_board::accounts::AcceptBounty {
                bounty,
                worker: worker.pubkey(),
            }
            .to_account_metas(None),
        );
        self.send(instruction, worker)
    }

    fn submit(&mut self, bounty: Pubkey, worker: &Keypair, submission: &str) -> TxResult {
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::SubmitWork {
                submission_ref: submission.to_string(),
            }
            .data(),
            bounty_board::accounts::SubmitWork {
                bounty,
                worker: worker.pubkey(),
            }
            .to_account_metas(None),
        );
        self.send(instruction, worker)
    }

    /// approve_bounty: `signer` approves and the reward goes to `pay_to`
    fn approve(&mut self, bounty: Pubkey, signer: &Keypair, pay_to: Pubkey) -> TxResult {
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::ApproveBounty {}.data(),
            bounty_board::accounts::ApproveBounty {
                bounty,
                creator: signer.pubkey(),
                worker: pay_to,
            }
            .to_account_metas(None),
        );
        self.send(instruction, signer)
    }

    fn cancel(&mut self, bounty: Pubkey, signer: &Keypair) -> TxResult {
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::CancelBounty {}.data(),
            bounty_board::accounts::CancelBounty {
                bounty,
                creator: signer.pubkey(),
            }
            .to_account_metas(None),
        );
        self.send(instruction, signer)
    }

    // ---- Shortcuts to reach a given stage ----

    /// Created and accepted by `users.worker`
    fn accepted_bounty(&mut self, users: &Users) -> Pubkey {
        let bounty = self.create_default(&users.creator);
        self.accept(bounty, &users.worker).expect("accept should succeed");
        bounty
    }

    /// Created, accepted and submitted by `users.worker`
    fn submitted_bounty(&mut self, users: &Users) -> Pubkey {
        let bounty = self.accepted_bounty(users);
        self.submit(bounty, &users.worker, DEFAULT_SUBMISSION)
            .expect("submit should succeed");
        bounty
    }
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

/// The transaction must fail with this exact program error
fn assert_error(result: TxResult, expected: BountyError) {
    let code = ANCHOR_ERROR_OFFSET + expected as u32;
    match result {
        Ok(()) => panic!("expected program error {code}, but the transaction succeeded"),
        Err(details) => assert!(
            details.contains(&format!("Custom({code})")),
            "expected program error {code}, but got: {details}"
        ),
    }
}

/// The transaction must fail (used where the rejection comes from Anchor or
/// Solana itself rather than from our own error codes)
fn assert_fails(result: TxResult) {
    assert!(result.is_err(), "expected the transaction to fail, but it succeeded");
}

fn assert_status(chain: &Chain, bounty: &Pubkey, expected: BountyStatus) {
    assert!(
        chain.read(bounty).status == expected,
        "bounty is not in the expected status"
    );
}

// ===========================================================================
// CREATE: a user posting a bounty
// ===========================================================================

mod create {
    use super::*;

    #[test]
    fn stores_all_fields_and_starts_open() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        let data = chain.read(&bounty);
        assert_eq!(data.creator, users.creator.pubkey());
        assert_eq!(data.worker, None);
        assert_eq!(data.bounty_id, 1);
        assert_eq!(data.reward_lamports, REWARD);
        assert_eq!(data.title, DEFAULT_TITLE);
        assert_eq!(data.description_ref, DEFAULT_DESCRIPTION);
        assert_eq!(data.deadline, NOW + 7 * DAY);
        assert_eq!(data.submission_ref, None);
        assert!(data.status == BountyStatus::Open);
    }

    #[test]
    fn locks_reward_in_escrow() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        let rent = chain.bounty_rent();

        // Bounty account holds its rent deposit plus the full reward
        assert_eq!(chain.balance(&bounty), rent + REWARD);

        // Creator paid exactly that (fees were paid by the fee payer)
        assert_eq!(
            chain.balance(&users.creator.pubkey()),
            STARTING_BALANCE - rent - REWARD
        );
    }

    #[test]
    fn rejects_empty_title() {
        let (mut chain, users) = setup();
        let result = chain.create(&users.creator, 1, "", DEFAULT_DESCRIPTION, REWARD, NOW + DAY);
        assert_error(result, BountyError::InvalidTitle);
    }

    #[test]
    fn accepts_title_of_exactly_64_bytes() {
        let (mut chain, users) = setup();
        let title = "a".repeat(64);
        chain
            .create(&users.creator, 1, &title, DEFAULT_DESCRIPTION, REWARD, NOW + DAY)
            .expect("64-byte title is the maximum and should be allowed");
        assert_eq!(chain.read(&bounty_pda(&users.creator.pubkey(), 1)).title, title);
    }

    #[test]
    fn rejects_title_of_65_bytes() {
        let (mut chain, users) = setup();
        let title = "a".repeat(65);
        let result = chain.create(&users.creator, 1, &title, DEFAULT_DESCRIPTION, REWARD, NOW + DAY);
        assert_error(result, BountyError::InvalidTitle);
    }

    #[test]
    fn title_limit_counts_bytes_not_characters() {
        let (mut chain, users) = setup();

        // "€" is 3 bytes: 22 of them = 66 bytes (too long) even though it's 22 characters
        let too_long = "€".repeat(22);
        let result = chain.create(&users.creator, 1, &too_long, DEFAULT_DESCRIPTION, REWARD, NOW + DAY);
        assert_error(result, BountyError::InvalidTitle);

        // 21 of them = 63 bytes (fits)
        let fits = "€".repeat(21);
        chain
            .create(&users.creator, 1, &fits, DEFAULT_DESCRIPTION, REWARD, NOW + DAY)
            .expect("63-byte title should be allowed");
    }

    #[test]
    fn rejects_empty_description() {
        let (mut chain, users) = setup();
        let result = chain.create(&users.creator, 1, DEFAULT_TITLE, "", REWARD, NOW + DAY);
        assert_error(result, BountyError::InvalidDescription);
    }

    #[test]
    fn accepts_description_of_exactly_200_bytes() {
        let (mut chain, users) = setup();
        let description = "d".repeat(200);
        chain
            .create(&users.creator, 1, DEFAULT_TITLE, &description, REWARD, NOW + DAY)
            .expect("200-byte description is the maximum and should be allowed");
    }

    #[test]
    fn rejects_description_of_201_bytes() {
        let (mut chain, users) = setup();
        let description = "d".repeat(201);
        let result = chain.create(&users.creator, 1, DEFAULT_TITLE, &description, REWARD, NOW + DAY);
        assert_error(result, BountyError::InvalidDescription);
    }

    #[test]
    fn rejects_zero_reward() {
        let (mut chain, users) = setup();
        let result = chain.create(&users.creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, 0, NOW + DAY);
        assert_error(result, BountyError::InvalidReward);
    }

    #[test]
    fn accepts_smallest_reward_of_one_lamport() {
        let (mut chain, users) = setup();
        chain
            .create(&users.creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, 1, NOW + DAY)
            .expect("a 1-lamport reward should be allowed");
    }

    #[test]
    fn rejects_deadline_in_the_past() {
        let (mut chain, users) = setup();
        let result = chain.create(&users.creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, REWARD, NOW - DAY);
        assert_error(result, BountyError::InvalidDeadline);
    }

    #[test]
    fn rejects_deadline_equal_to_now() {
        let (mut chain, users) = setup();
        let result = chain.create(&users.creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, REWARD, NOW);
        assert_error(result, BountyError::InvalidDeadline);
    }

    #[test]
    fn accepts_deadline_one_second_from_now() {
        let (mut chain, users) = setup();
        chain
            .create(&users.creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, REWARD, NOW + 1)
            .expect("a deadline 1 second in the future should be allowed");
    }

    #[test]
    fn rejects_creator_who_cannot_afford_reward() {
        let (mut chain, _users) = setup();

        // 0.01 SOL: enough for the rent deposit, not for a 0.5 SOL reward
        let poor_creator = Keypair::new();
        chain.svm.airdrop(&poor_creator.pubkey(), 10_000_000).unwrap();

        let result = chain.create(&poor_creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, REWARD, NOW + DAY);
        assert_error(result, BountyError::InsufficientEscrow);

        // Nothing was created and the creator kept their SOL
        assert!(!chain.exists(&bounty_pda(&poor_creator.pubkey(), 1)));
        assert_eq!(chain.balance(&poor_creator.pubkey()), 10_000_000);
    }

    #[test]
    fn creator_can_spend_entire_balance() {
        let (mut chain, _users) = setup();
        let rent = chain.bounty_rent();

        // Exactly enough for rent + reward
        let creator = Keypair::new();
        chain.svm.airdrop(&creator.pubkey(), rent + REWARD).unwrap();

        chain
            .create(&creator, 1, DEFAULT_TITLE, DEFAULT_DESCRIPTION, REWARD, NOW + DAY)
            .expect("creator with exactly rent + reward should be able to post");
        assert_eq!(chain.balance(&bounty_pda(&creator.pubkey(), 1)), rent + REWARD);
        assert_eq!(chain.balance(&creator.pubkey()), 0);
    }

    #[test]
    fn rejects_reusing_the_same_bounty_id() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        // Same creator, same id: the account already exists
        let result = chain.create(&users.creator, 1, "Another job", DEFAULT_DESCRIPTION, REWARD, NOW + DAY);
        assert_fails(result);

        // The original bounty is untouched
        assert_eq!(chain.read(&bounty).title, DEFAULT_TITLE);
    }

    #[test]
    fn same_creator_can_post_several_bounties_with_different_ids() {
        let (mut chain, users) = setup();
        chain.create(&users.creator, 1, "Job one", DEFAULT_DESCRIPTION, REWARD, NOW + DAY).unwrap();
        chain.create(&users.creator, 2, "Job two", DEFAULT_DESCRIPTION, REWARD, NOW + DAY).unwrap();

        assert_eq!(chain.read(&bounty_pda(&users.creator.pubkey(), 1)).title, "Job one");
        assert_eq!(chain.read(&bounty_pda(&users.creator.pubkey(), 2)).title, "Job two");
    }

    #[test]
    fn different_creators_can_use_the_same_bounty_id() {
        let (mut chain, users) = setup();
        chain.create(&users.creator, 1, "Creator's job", DEFAULT_DESCRIPTION, REWARD, NOW + DAY).unwrap();
        chain.create(&users.stranger, 1, "Stranger's job", DEFAULT_DESCRIPTION, REWARD, NOW + DAY).unwrap();

        // Different creators give different addresses
        assert_eq!(chain.read(&bounty_pda(&users.creator.pubkey(), 1)).title, "Creator's job");
        assert_eq!(chain.read(&bounty_pda(&users.stranger.pubkey(), 1)).title, "Stranger's job");
    }

    #[test]
    fn rejects_account_at_the_wrong_address() {
        let (mut chain, users) = setup();

        // Address for bounty #2, but the instruction says bounty #1
        let wrong_address = bounty_pda(&users.creator.pubkey(), 2);
        let result = chain.create_at(
            wrong_address,
            &users.creator,
            1,
            DEFAULT_TITLE,
            DEFAULT_DESCRIPTION,
            REWARD,
            NOW + DAY,
        );
        assert_fails(result);
        assert!(!chain.exists(&wrong_address));
    }

    #[test]
    fn cannot_create_a_bounty_paid_from_someone_elses_wallet() {
        let (mut chain, users) = setup();

        // Instruction names `creator` as the payer, but `stranger` signs
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::CreateBounty {
                bounty_id: 1,
                title: DEFAULT_TITLE.to_string(),
                description_ref: DEFAULT_DESCRIPTION.to_string(),
                reward_lamports: REWARD,
                deadline: NOW + DAY,
            }
            .data(),
            bounty_board::accounts::CreateBounty {
                bounty: bounty_pda(&users.creator.pubkey(), 1),
                creator: users.creator.pubkey(),
                system_program: system_program::ID,
            }
            .to_account_metas(None),
        );
        assert_fails(chain.send(instruction, &users.stranger));
        assert_eq!(chain.balance(&users.creator.pubkey()), STARTING_BALANCE);
    }
}

// ===========================================================================
// ACCEPT: a worker claiming a bounty
// ===========================================================================

mod accept {
    use super::*;

    #[test]
    fn worker_can_accept_an_open_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        chain.accept(bounty, &users.worker).expect("accept should succeed");

        let data = chain.read(&bounty);
        assert_eq!(data.worker, Some(users.worker.pubkey()));
        assert!(data.status == BountyStatus::Accepted);
    }

    #[test]
    fn accepting_does_not_move_any_sol() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        let escrow_before = chain.balance(&bounty);

        chain.accept(bounty, &users.worker).unwrap();

        assert_eq!(chain.balance(&bounty), escrow_before);
        assert_eq!(chain.balance(&users.worker.pubkey()), STARTING_BALANCE);
    }

    #[test]
    fn creator_cannot_accept_own_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        let result = chain.accept(bounty, &users.creator);
        assert_error(result, BountyError::CannotAcceptOwnBounty);
        assert_status(&chain, &bounty, BountyStatus::Open);
    }

    #[test]
    fn second_worker_cannot_take_an_accepted_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.accept(bounty, &users.stranger);
        assert_error(result, BountyError::BountyNotOpen);

        // Still assigned to the first worker
        assert_eq!(chain.read(&bounty).worker, Some(users.worker.pubkey()));
    }

    #[test]
    fn same_worker_cannot_accept_twice() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.accept(bounty, &users.worker);
        assert_error(result, BountyError::BountyNotOpen);
    }

    #[test]
    fn can_accept_one_second_before_deadline() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        chain.set_time(NOW + 7 * DAY - 1);
        chain.accept(bounty, &users.worker).expect("accept just before deadline should succeed");
    }

    #[test]
    fn cannot_accept_at_the_deadline() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        chain.set_time(NOW + 7 * DAY);
        let result = chain.accept(bounty, &users.worker);
        assert_error(result, BountyError::BountyExpired);
    }

    #[test]
    fn cannot_accept_after_the_deadline() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        chain.set_time(NOW + 30 * DAY);
        let result = chain.accept(bounty, &users.worker);
        assert_error(result, BountyError::BountyExpired);
        assert_status(&chain, &bounty, BountyStatus::Open);
    }

    #[test]
    fn cannot_accept_a_cancelled_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        chain.cancel(bounty, &users.creator).unwrap();

        let result = chain.accept(bounty, &users.worker);
        assert_error(result, BountyError::BountyNotOpen);
    }

    #[test]
    fn cannot_accept_a_completed_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);
        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();

        let result = chain.accept(bounty, &users.stranger);
        assert_error(result, BountyError::BountyNotOpen);
    }

    #[test]
    fn cannot_accept_a_bounty_that_does_not_exist() {
        let (mut chain, users) = setup();
        let never_created = bounty_pda(&users.creator.pubkey(), 99);

        assert_fails(chain.accept(never_created, &users.worker));
    }

    #[test]
    fn cannot_accept_on_behalf_of_another_wallet() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        // Instruction names `worker`, but `stranger` signs
        let instruction = Instruction::new_with_bytes(
            bounty_board::id(),
            &bounty_board::instruction::AcceptBounty {}.data(),
            bounty_board::accounts::AcceptBounty {
                bounty,
                worker: users.worker.pubkey(),
            }
            .to_account_metas(None),
        );
        assert_fails(chain.send(instruction, &users.stranger));
        assert_status(&chain, &bounty, BountyStatus::Open);
    }

    #[test]
    fn worker_can_hold_bounties_from_different_creators() {
        let (mut chain, users) = setup();
        let first = chain.create_default(&users.creator);
        let second = chain.create_default(&users.stranger);

        chain.accept(first, &users.worker).unwrap();
        chain.accept(second, &users.worker).unwrap();

        assert_eq!(chain.read(&first).worker, Some(users.worker.pubkey()));
        assert_eq!(chain.read(&second).worker, Some(users.worker.pubkey()));
    }
}

// ===========================================================================
// SUBMIT: the worker handing in their work
// ===========================================================================

mod submit {
    use super::*;

    #[test]
    fn worker_can_submit_work() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        chain
            .submit(bounty, &users.worker, DEFAULT_SUBMISSION)
            .expect("submit should succeed");

        let data = chain.read(&bounty);
        assert_eq!(data.submission_ref, Some(DEFAULT_SUBMISSION.to_string()));
        assert!(data.status == BountyStatus::Submitted);
    }

    #[test]
    fn cannot_submit_before_accepting() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        let result = chain.submit(bounty, &users.worker, DEFAULT_SUBMISSION);
        assert_error(result, BountyError::BountyNotAccepted);
    }

    #[test]
    fn stranger_cannot_submit_for_the_worker() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.submit(bounty, &users.stranger, DEFAULT_SUBMISSION);
        assert_error(result, BountyError::UnauthorizedWorker);
        assert_status(&chain, &bounty, BountyStatus::Accepted);
    }

    #[test]
    fn creator_cannot_submit_work() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.submit(bounty, &users.creator, DEFAULT_SUBMISSION);
        assert_error(result, BountyError::UnauthorizedWorker);
    }

    #[test]
    fn rejects_empty_submission() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.submit(bounty, &users.worker, "");
        assert_error(result, BountyError::InvalidSubmission);
    }

    #[test]
    fn accepts_submission_of_exactly_200_bytes() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let submission = "s".repeat(200);
        chain
            .submit(bounty, &users.worker, &submission)
            .expect("200-byte submission is the maximum and should be allowed");
    }

    #[test]
    fn rejects_submission_of_201_bytes() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let submission = "s".repeat(201);
        let result = chain.submit(bounty, &users.worker, &submission);
        assert_error(result, BountyError::InvalidSubmission);
    }

    #[test]
    fn cannot_submit_at_or_after_the_deadline() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        chain.set_time(NOW + 7 * DAY);
        let result = chain.submit(bounty, &users.worker, DEFAULT_SUBMISSION);
        assert_error(result, BountyError::BountyExpired);
        assert_status(&chain, &bounty, BountyStatus::Accepted);
    }

    #[test]
    fn can_submit_one_second_before_deadline() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        chain.set_time(NOW + 7 * DAY - 1);
        chain
            .submit(bounty, &users.worker, DEFAULT_SUBMISSION)
            .expect("submit just before deadline should succeed");
    }

    #[test]
    fn cannot_submit_twice() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        let result = chain.submit(bounty, &users.worker, "https://example.com/changed-my-mind");
        assert_error(result, BountyError::BountyNotAccepted);

        // First submission is kept
        assert_eq!(
            chain.read(&bounty).submission_ref,
            Some(DEFAULT_SUBMISSION.to_string())
        );
    }

    #[test]
    fn submitting_does_not_move_any_sol() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);
        let escrow_before = chain.balance(&bounty);

        chain.submit(bounty, &users.worker, DEFAULT_SUBMISSION).unwrap();

        assert_eq!(chain.balance(&bounty), escrow_before);
    }
}

// ===========================================================================
// APPROVE: the creator approving and paying from escrow
// ===========================================================================

mod approve {
    use super::*;

    #[test]
    fn pays_worker_exactly_the_reward() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);
        let worker_before = chain.balance(&users.worker.pubkey());
        let escrow_before = chain.balance(&bounty);

        chain
            .approve(bounty, &users.creator, users.worker.pubkey())
            .expect("approve should succeed");

        assert_eq!(chain.balance(&users.worker.pubkey()), worker_before + REWARD);
        assert_eq!(chain.balance(&bounty), escrow_before - REWARD);
        assert_status(&chain, &bounty, BountyStatus::Completed);
    }

    #[test]
    fn escrow_keeps_only_the_rent_deposit_afterwards() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();

        assert_eq!(chain.balance(&bounty), chain.bounty_rent());
    }

    #[test]
    fn stranger_cannot_approve() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        let result = chain.approve(bounty, &users.stranger, users.worker.pubkey());
        assert_error(result, BountyError::NotBountyCreator);
        assert_status(&chain, &bounty, BountyStatus::Submitted);
    }

    #[test]
    fn worker_cannot_approve_their_own_work() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        let result = chain.approve(bounty, &users.worker, users.worker.pubkey());
        assert_error(result, BountyError::NotBountyCreator);
        assert_status(&chain, &bounty, BountyStatus::Submitted);
    }

    #[test]
    fn cannot_send_the_reward_to_a_different_wallet() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        let result = chain.approve(bounty, &users.creator, users.stranger.pubkey());
        assert_error(result, BountyError::WrongWorker);
        assert_eq!(chain.balance(&users.stranger.pubkey()), STARTING_BALANCE);
    }

    #[test]
    fn creator_cannot_pay_the_reward_back_to_themselves() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        let result = chain.approve(bounty, &users.creator, users.creator.pubkey());
        assert_fails(result);
        assert_status(&chain, &bounty, BountyStatus::Submitted);
    }

    #[test]
    fn cannot_approve_an_open_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        // No worker assigned yet, so no wallet can match the worker check
        let result = chain.approve(bounty, &users.creator, users.worker.pubkey());
        assert_error(result, BountyError::WrongWorker);
        assert_status(&chain, &bounty, BountyStatus::Open);
    }

    #[test]
    fn cannot_approve_before_work_is_submitted() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.approve(bounty, &users.creator, users.worker.pubkey());
        assert_error(result, BountyError::InvalidStatus);
        assert_status(&chain, &bounty, BountyStatus::Accepted);
    }

    #[test]
    fn cannot_approve_twice() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);
        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();
        let worker_after_first = chain.balance(&users.worker.pubkey());

        let result = chain.approve(bounty, &users.creator, users.worker.pubkey());
        assert_error(result, BountyError::InvalidStatus);

        // No second payout
        assert_eq!(chain.balance(&users.worker.pubkey()), worker_after_first);
    }

    #[test]
    fn cannot_approve_a_cancelled_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        chain.cancel(bounty, &users.creator).unwrap();

        // Cancelled before anyone accepted, so there's no worker to pay
        let result = chain.approve(bounty, &users.creator, users.worker.pubkey());
        assert_fails(result);
        assert_status(&chain, &bounty, BountyStatus::Cancelled);
    }

    #[test]
    fn creator_can_still_approve_after_the_deadline() {
        // Work handed in on time shouldn't go unpaid because the creator
        // was slow to review it
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);

        chain.set_time(NOW + 60 * DAY);
        chain
            .approve(bounty, &users.creator, users.worker.pubkey())
            .expect("approve after the deadline should still succeed");
        assert_status(&chain, &bounty, BountyStatus::Completed);
    }
}

// ===========================================================================
// CANCEL: the creator cancelling and getting a refund from escrow
// ===========================================================================

mod cancel {
    use super::*;

    #[test]
    fn refunds_the_reward_to_the_creator() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        let creator_before = chain.balance(&users.creator.pubkey());

        chain.cancel(bounty, &users.creator).expect("cancel should succeed");

        assert_eq!(chain.balance(&users.creator.pubkey()), creator_before + REWARD);
        assert_status(&chain, &bounty, BountyStatus::Cancelled);
    }

    #[test]
    fn creator_is_only_out_the_rent_deposit_afterwards() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        chain.cancel(bounty, &users.creator).unwrap();

        let rent = chain.bounty_rent();
        assert_eq!(chain.balance(&users.creator.pubkey()), STARTING_BALANCE - rent);
        assert_eq!(chain.balance(&bounty), rent);
    }

    #[test]
    fn stranger_cannot_cancel() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        let result = chain.cancel(bounty, &users.stranger);
        assert_error(result, BountyError::NotBountyCreator);
        assert_eq!(chain.balance(&users.stranger.pubkey()), STARTING_BALANCE);
        assert_status(&chain, &bounty, BountyStatus::Open);
    }

    #[test]
    fn cannot_cancel_after_a_worker_accepts() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        let result = chain.cancel(bounty, &users.creator);
        assert_error(result, BountyError::InvalidStatus);
        assert_status(&chain, &bounty, BountyStatus::Accepted);
    }

    #[test]
    fn cannot_cancel_after_work_is_submitted() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);
        let escrow_before = chain.balance(&bounty);

        let result = chain.cancel(bounty, &users.creator);
        assert_error(result, BountyError::InvalidStatus);

        // Worker's reward is still safe in escrow
        assert_eq!(chain.balance(&bounty), escrow_before);
    }

    #[test]
    fn cannot_cancel_a_completed_bounty() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);
        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();

        let result = chain.cancel(bounty, &users.creator);
        assert_error(result, BountyError::InvalidStatus);
    }

    #[test]
    fn cannot_cancel_twice() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        chain.cancel(bounty, &users.creator).unwrap();
        let creator_after_first = chain.balance(&users.creator.pubkey());

        let result = chain.cancel(bounty, &users.creator);
        assert_error(result, BountyError::InvalidStatus);

        // No second refund
        assert_eq!(chain.balance(&users.creator.pubkey()), creator_after_first);
    }

    #[test]
    fn can_cancel_an_open_bounty_after_its_deadline() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);

        chain.set_time(NOW + 30 * DAY);
        chain
            .cancel(bounty, &users.creator)
            .expect("an expired bounty nobody took should be refundable");
    }

    /// Documents a known gap: if a worker accepts and never submits, the
    /// creator cannot cancel even after the deadline, so the reward stays
    /// locked. If the team changes cancel() to allow this, flip this test.
    #[test]
    fn known_gap_accepted_but_abandoned_bounty_cannot_be_cancelled() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);

        chain.set_time(NOW + 30 * DAY);
        let result = chain.cancel(bounty, &users.creator);
        assert_error(result, BountyError::InvalidStatus);
        assert_eq!(chain.balance(&bounty), chain.bounty_rent() + REWARD);
    }
}

// ===========================================================================
// LIFECYCLE: whole flows across instructions and bounties
// ===========================================================================

mod lifecycle {
    use super::*;

    #[test]
    fn full_happy_path_moves_money_correctly() {
        let (mut chain, users) = setup();
        let rent = chain.bounty_rent();

        let bounty = chain.create_default(&users.creator);
        assert_status(&chain, &bounty, BountyStatus::Open);

        chain.accept(bounty, &users.worker).unwrap();
        assert_status(&chain, &bounty, BountyStatus::Accepted);

        chain.submit(bounty, &users.worker, DEFAULT_SUBMISSION).unwrap();
        assert_status(&chain, &bounty, BountyStatus::Submitted);

        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();
        assert_status(&chain, &bounty, BountyStatus::Completed);

        // Creator paid reward + rent, worker received the reward, escrow keeps rent
        assert_eq!(chain.balance(&users.creator.pubkey()), STARTING_BALANCE - REWARD - rent);
        assert_eq!(chain.balance(&users.worker.pubkey()), STARTING_BALANCE + REWARD);
        assert_eq!(chain.balance(&bounty), rent);
    }

    #[test]
    fn no_sol_is_created_or_lost() {
        let (mut chain, users) = setup();
        let people = [
            users.creator.pubkey(),
            users.worker.pubkey(),
            users.stranger.pubkey(),
        ];
        let bounty = bounty_pda(&users.creator.pubkey(), 1);
        let total = |chain: &Chain| -> u64 {
            people.iter().map(|p| chain.balance(p)).sum::<u64>() + chain.balance(&bounty)
        };
        let before = total(&chain);

        chain.create_default(&users.creator);
        chain.accept(bounty, &users.worker).unwrap();
        chain.submit(bounty, &users.worker, DEFAULT_SUBMISSION).unwrap();
        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();

        // Every lamport is still with the users or in the bounty account
        // (fees came from the separate fee payer)
        assert_eq!(total(&chain), before);
    }

    #[test]
    fn bounties_have_separate_escrows() {
        let (mut chain, users) = setup();
        let rent = chain.bounty_rent();

        chain.create(&users.creator, 1, "Job one", DEFAULT_DESCRIPTION, REWARD, NOW + DAY).unwrap();
        chain.create(&users.creator, 2, "Job two", DEFAULT_DESCRIPTION, 2 * REWARD, NOW + DAY).unwrap();
        let first = bounty_pda(&users.creator.pubkey(), 1);
        let second = bounty_pda(&users.creator.pubkey(), 2);

        // Cancelling one refunds only its own reward
        chain.cancel(first, &users.creator).unwrap();
        assert_eq!(chain.balance(&first), rent);
        assert_eq!(chain.balance(&second), rent + 2 * REWARD);

        // The other can still be worked and paid in full
        chain.accept(second, &users.worker).unwrap();
        chain.submit(second, &users.worker, DEFAULT_SUBMISSION).unwrap();
        chain.approve(second, &users.creator, users.worker.pubkey()).unwrap();
        assert_eq!(chain.balance(&users.worker.pubkey()), STARTING_BALANCE + 2 * REWARD);
    }

    #[test]
    fn cancelled_bounty_is_frozen() {
        let (mut chain, users) = setup();
        let bounty = chain.create_default(&users.creator);
        chain.cancel(bounty, &users.creator).unwrap();

        assert_fails(chain.accept(bounty, &users.worker));
        assert_fails(chain.submit(bounty, &users.worker, DEFAULT_SUBMISSION));
        assert_fails(chain.approve(bounty, &users.creator, users.worker.pubkey()));
        assert_fails(chain.cancel(bounty, &users.creator));
        assert_status(&chain, &bounty, BountyStatus::Cancelled);
    }

    #[test]
    fn completed_bounty_is_frozen() {
        let (mut chain, users) = setup();
        let bounty = chain.submitted_bounty(&users);
        chain.approve(bounty, &users.creator, users.worker.pubkey()).unwrap();

        assert_fails(chain.accept(bounty, &users.stranger));
        assert_fails(chain.submit(bounty, &users.worker, "https://example.com/again"));
        assert_fails(chain.approve(bounty, &users.creator, users.worker.pubkey()));
        assert_fails(chain.cancel(bounty, &users.creator));
        assert_status(&chain, &bounty, BountyStatus::Completed);
    }

    #[test]
    fn failed_actions_leave_everything_unchanged() {
        let (mut chain, users) = setup();
        let bounty = chain.accepted_bounty(&users);
        let escrow = chain.balance(&bounty);
        let creator = chain.balance(&users.creator.pubkey());
        let worker = chain.balance(&users.worker.pubkey());

        // A batch of things that should all be rejected
        assert_fails(chain.accept(bounty, &users.stranger));
        assert_fails(chain.submit(bounty, &users.stranger, DEFAULT_SUBMISSION));
        assert_fails(chain.approve(bounty, &users.creator, users.worker.pubkey()));
        assert_fails(chain.cancel(bounty, &users.creator));
        assert_fails(chain.cancel(bounty, &users.stranger));

        let data = chain.read(&bounty);
        assert!(data.status == BountyStatus::Accepted);
        assert_eq!(data.worker, Some(users.worker.pubkey()));
        assert_eq!(data.submission_ref, None);
        assert_eq!(chain.balance(&bounty), escrow);
        assert_eq!(chain.balance(&users.creator.pubkey()), creator);
        assert_eq!(chain.balance(&users.worker.pubkey()), worker);
    }
}

// ===========================================================================
// RULES: the Bounty helper methods, called directly (no blockchain needed)
// ===========================================================================

mod rules {
    use super::*;

    fn sample_bounty(status: BountyStatus) -> Bounty {
        Bounty {
            creator: Pubkey::new_unique(),
            worker: None,
            bounty_id: 1,
            reward_lamports: REWARD,
            title: DEFAULT_TITLE.to_string(),
            description_ref: DEFAULT_DESCRIPTION.to_string(),
            deadline: NOW + DAY,
            status,
            submission_ref: None,
        }
    }

    #[test]
    fn is_available_only_when_open_unclaimed_and_not_expired() {
        let open = sample_bounty(BountyStatus::Open);
        assert!(open.is_available(NOW));
        assert!(!open.is_available(NOW + DAY)); // at the deadline
        assert!(!open.is_available(NOW + 2 * DAY)); // after the deadline

        let mut claimed = sample_bounty(BountyStatus::Open);
        claimed.worker = Some(Pubkey::new_unique());
        assert!(!claimed.is_available(NOW));

        for status in [
            BountyStatus::Accepted,
            BountyStatus::Submitted,
            BountyStatus::Completed,
            BountyStatus::Cancelled,
        ] {
            assert!(!sample_bounty(status).is_available(NOW));
        }
    }

    #[test]
    fn complete_only_works_from_submitted() {
        let mut submitted = sample_bounty(BountyStatus::Submitted);
        assert!(submitted.complete().is_ok());
        assert!(submitted.status == BountyStatus::Completed);

        for status in [
            BountyStatus::Open,
            BountyStatus::Accepted,
            BountyStatus::Completed,
            BountyStatus::Cancelled,
        ] {
            assert!(sample_bounty(status).complete().is_err());
        }
    }

    #[test]
    fn cancel_only_works_from_open() {
        let mut open = sample_bounty(BountyStatus::Open);
        assert!(open.cancel().is_ok());
        assert!(open.status == BountyStatus::Cancelled);

        for status in [
            BountyStatus::Accepted,
            BountyStatus::Submitted,
            BountyStatus::Completed,
            BountyStatus::Cancelled,
        ] {
            assert!(sample_bounty(status).cancel().is_err());
        }
    }

    #[test]
    fn accept_assigns_worker_and_changes_status() {
        let mut bounty = sample_bounty(BountyStatus::Open);
        let worker = Pubkey::new_unique();

        assert!(bounty.accept(worker, NOW).is_ok());
        assert_eq!(bounty.worker, Some(worker));
        assert!(bounty.status == BountyStatus::Accepted);
    }

    #[test]
    fn submit_work_records_submission() {
        let mut bounty = sample_bounty(BountyStatus::Open);
        let worker = Pubkey::new_unique();
        bounty.accept(worker, NOW).unwrap();

        assert!(bounty
            .submit_work(worker, DEFAULT_SUBMISSION.to_string(), NOW)
            .is_ok());
        assert_eq!(bounty.submission_ref, Some(DEFAULT_SUBMISSION.to_string()));
        assert!(bounty.status == BountyStatus::Submitted);
    }
}
