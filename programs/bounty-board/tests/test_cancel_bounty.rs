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

// Someone calls cancel_bounty. Returns true if it succeeded.
fn cancel_bounty(svm: &mut LiteSVM, program_id: Pubkey, bounty: Pubkey, signer: &Keypair) -> bool {
    let instruction = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::CancelBounty {}.data(),
        bounty_board::accounts::CancelBounty {
            bounty,
            creator: signer.pubkey(),
        }
        .to_account_metas(None),
    );

    send_instruction(svm, instruction, signer)
}

#[test]
fn test_creator_can_cancel_open_bounty() {
    let (mut svm, program_id, creator, _worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);

    // Nobody has accepted yet, so the creator can cancel
    assert!(cancel_bounty(&mut svm, program_id, bounty, &creator));

    // Status should now be Cancelled
    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Cancelled);
}

#[test]
fn test_only_creator_can_cancel() {
    let (mut svm, program_id, creator, _worker, stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);

    // A stranger tries to cancel someone else's bounty: must fail
    assert!(!cancel_bounty(&mut svm, program_id, bounty, &stranger));

    // Status should still be Open
    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Open);
}

#[test]
fn test_cannot_cancel_after_accept() {
    let (mut svm, program_id, creator, worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);
    assert!(accept_bounty(&mut svm, program_id, bounty, &worker));

    // A worker already accepted, so the creator can't cancel anymore
    assert!(!cancel_bounty(&mut svm, program_id, bounty, &creator));

    // Status should still be Accepted
    assert!(read_bounty(&svm, &bounty).status == BountyStatus::Accepted);
}

#[test]
fn test_cannot_cancel_twice() {
    let (mut svm, program_id, creator, _worker, _stranger) = setup();
    let bounty = create_bounty(&mut svm, program_id, &creator);

    assert!(cancel_bounty(&mut svm, program_id, bounty, &creator));

    // Already cancelled, so a second cancel must fail
    assert!(!cancel_bounty(&mut svm, program_id, bounty, &creator));
}