use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize,
        InstructionData,
        ToAccountMetas,
    },
    bounty_board::bounty::{Bounty, BountyStatus},
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

// Send a signed instruction to our simulated Solana blockchain.
fn send_instruction(
    svm: &mut LiteSVM,
    instruction: Instruction,
    payer: &Keypair,
) -> bool {
    // New blockhash each time, so sending the same instruction twice is a real
    // second attempt instead of being rejected as a duplicate transaction
    svm.expire_blockhash();
    let blockhash = svm.latest_blockhash();

    let message = Message::new_with_blockhash(
        &[instruction],
        Some(&payer.pubkey()),
        &blockhash,
    );

    let transaction = VersionedTransaction::try_new(
        VersionedMessage::Legacy(message),
        &[payer],
    )
    .unwrap();

    svm.send_transaction(transaction).is_ok()
}

// Read the bounty account stored in LiteSVM.
fn read_bounty(svm: &LiteSVM, address: &Pubkey) -> Bounty {
    let account = svm.get_account(address).unwrap();
    let mut data: &[u8] = &account.data;

    Bounty::try_deserialize(&mut data).unwrap()
}

// Set up the simulated blockchain with our program and 3 funded wallets.
fn setup() -> (LiteSVM, Pubkey, Keypair, Keypair, Keypair) {
    let program_id = bounty_board::id();
    let mut svm = LiteSVM::new();

    let program_bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/bounty_board.so"
    ));
    svm.add_program(program_id, program_bytes).unwrap();

    let creator = Keypair::new();
    let worker = Keypair::new();
    let stranger = Keypair::new();

    for wallet in [&creator, &worker, &stranger] {
        svm.airdrop(&wallet.pubkey(), 1_000_000_000).unwrap();
    }

    (svm, program_id, creator, worker, stranger)
}

// Creator posts a bounty. Returns the bounty's PDA address.
fn create_bounty(svm: &mut LiteSVM, program_id: Pubkey, creator: &Keypair) -> Pubkey {
    let bounty_id: u64 = 1;

    let (bounty_address, _) = Pubkey::find_program_address(
        &[b"bounty", creator.pubkey().as_ref(), &bounty_id.to_le_bytes()],
        &program_id,
    );

    let instruction = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::CreateBounty {
            bounty_id,
            title: "Design a logo".to_string(),
            description_ref: "https://example.com/logo".to_string(),
            reward_lamports: 100_000_000,
            deadline: 4_000_000_000,
        }
        .data(),
        bounty_board::accounts::CreateBounty {
            bounty: bounty_address,
            creator: creator.pubkey(),
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );

    assert!(send_instruction(svm, instruction, creator));
    bounty_address
}

// Worker accepts the bounty.
fn accept_bounty(svm: &mut LiteSVM, program_id: Pubkey, bounty: Pubkey, worker: &Keypair) -> bool {
    let instruction = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::AcceptBounty {}.data(),
        bounty_board::accounts::AcceptBounty {
            bounty,
            worker: worker.pubkey(),
        }
        .to_account_metas(None),
    );

    send_instruction(svm, instruction, worker)
}

// Worker submits a link to their finished work.
fn submit_work(svm: &mut LiteSVM, program_id: Pubkey, bounty: Pubkey, worker: &Keypair) -> bool {
    let instruction = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::SubmitWork {
            submission_ref: "https://example.com/finished-logo".to_string(),
        }
        .data(),
        bounty_board::accounts::SubmitWork {
            bounty,
            worker: worker.pubkey(),
        }
        .to_account_metas(None),
    );

    send_instruction(svm, instruction, worker)
}

// Someone calls approve_bounty, naming `worker` as the wallet to pay.
// Returns true if it succeeded.
fn approve_bounty(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    bounty: Pubkey,
    signer: &Keypair,
    worker: Pubkey,
) -> bool {
    let instruction = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::ApproveBounty {}.data(),
        bounty_board::accounts::ApproveBounty {
            bounty,
            creator: signer.pubkey(),
            worker,
        }
        .to_account_metas(None),
    );

    send_instruction(svm, instruction, signer)
}

#[test]
fn test_cannot_approve_open_bounty() {
    let (mut svm, program_id, creator, worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);

    // Nobody has accepted or submitted yet, so approving must fail
    assert!(!approve_bounty(&mut svm, program_id, bounty, &creator, worker.pubkey()));

    // Status should still be Open
    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Open);
}

#[test]
fn test_cannot_approve_before_submission() {
    let (mut svm, program_id, creator, worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);
    assert!(accept_bounty(&mut svm, program_id, bounty, &worker));

    // Worker accepted but hasn't submitted, so approving must fail
    assert!(!approve_bounty(&mut svm, program_id, bounty, &creator, worker.pubkey()));

    // Status should still be Accepted
    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Accepted);
}

#[test]
fn test_only_creator_can_approve() {
    let (mut svm, program_id, creator, worker, stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);
    assert!(accept_bounty(&mut svm, program_id, bounty, &worker));

    // A stranger tries to approve: must fail
    assert!(!approve_bounty(&mut svm, program_id, bounty, &stranger, worker.pubkey()));

    // The worker tries to approve their own work: must fail
    assert!(!approve_bounty(&mut svm, program_id, bounty, &worker, worker.pubkey()));

    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Accepted);
}

const REWARD: u64 = 100_000_000; // same reward create_bounty uses

#[test]
fn test_approve_pays_worker_from_escrow() {
    let (mut svm, program_id, creator, worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);
    assert!(accept_bounty(&mut svm, program_id, bounty, &worker));
    assert!(submit_work(&mut svm, program_id, bounty, &worker));

    let worker_before = svm.get_balance(&worker.pubkey()).unwrap();
    let escrow_before = svm.get_balance(&bounty).unwrap();

    // Creator approves (and pays the fee), so the worker's balance changes by exactly the reward
    assert!(approve_bounty(&mut svm, program_id, bounty, &creator, worker.pubkey()));

    assert_eq!(svm.get_balance(&worker.pubkey()).unwrap(), worker_before + REWARD);
    assert_eq!(svm.get_balance(&bounty).unwrap(), escrow_before - REWARD);
    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Completed);
}

#[test]
fn test_cannot_pay_a_different_wallet() {
    let (mut svm, program_id, creator, worker, stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);
    assert!(accept_bounty(&mut svm, program_id, bounty, &worker));
    assert!(submit_work(&mut svm, program_id, bounty, &worker));

    // Creator tries to send the reward to someone who isn't the worker: must fail
    assert!(!approve_bounty(&mut svm, program_id, bounty, &creator, stranger.pubkey()));

    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Submitted);
}

#[test]
fn test_cannot_approve_twice() {
    let (mut svm, program_id, creator, worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);
    assert!(accept_bounty(&mut svm, program_id, bounty, &worker));
    assert!(submit_work(&mut svm, program_id, bounty, &worker));
    assert!(approve_bounty(&mut svm, program_id, bounty, &creator, worker.pubkey()));

    // Already Completed, so a second approve must fail (no double payout)
    let worker_before = svm.get_balance(&worker.pubkey()).unwrap();
    assert!(!approve_bounty(&mut svm, program_id, bounty, &creator, worker.pubkey()));
    assert_eq!(svm.get_balance(&worker.pubkey()).unwrap(), worker_before);
}
