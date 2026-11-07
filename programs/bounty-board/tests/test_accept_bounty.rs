
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

#[test]
fn test_create_and_accept_bounty() {
    // 1. Set up our simulated blockchain.
    let program_id = bounty_board::id();
    let mut svm = LiteSVM::new();

    let program_bytes = include_bytes!(concat!(
        env!("CARGO_TARGET_TMPDIR"),
        "/../deploy/bounty_board.so"
    ));

    svm.add_program(program_id, program_bytes).unwrap();

    // 2. Create three separate wallets.
    let creator = Keypair::new();
    let worker1 = Keypair::new();
    let worker2 = Keypair::new();

    // Give each test wallet simulated SOL for transaction fees.
    for wallet in [&creator, &worker1, &worker2] {
        svm.airdrop(&wallet.pubkey(), 1_000_000_000).unwrap();
    }

    // 3. Derive the bounty's PDA using the same seeds as bounty.rs.
    let bounty_id: u64 = 1;

    let (bounty_address, _) = Pubkey::find_program_address(
        &[
            b"bounty",
            creator.pubkey().as_ref(),
            &bounty_id.to_le_bytes(),
        ],
        &program_id,
    );

    // 4. Build the CreateBounty instruction.
    let create_instruction = Instruction::new_with_bytes(
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

    // 5. Creator signs and creates the bounty.
    assert!(send_instruction(
        &mut svm,
        create_instruction,
        &creator
    ));

    let bounty = read_bounty(&svm, &bounty_address);

    assert!(bounty.status == BountyStatus::Open);
    assert_eq!(bounty.creator, creator.pubkey());
    assert_eq!(bounty.worker, None);
    assert_eq!(bounty.reward_lamports, 100_000_000);
    assert_eq!(bounty.title, "Design a logo");

    // 6. Creator tries to accept their own bounty.
    let self_accept = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::AcceptBounty {}.data(),
        bounty_board::accounts::AcceptBounty {
            bounty: bounty_address,
            worker: creator.pubkey(),
        }
        .to_account_metas(None),
    );

    assert!(!send_instruction(
        &mut svm,
        self_accept,
        &creator
    ));

    // 7. Worker 1 accepts the bounty.
    let accept_instruction = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::AcceptBounty {}.data(),
        bounty_board::accounts::AcceptBounty {
            bounty: bounty_address,
            worker: worker1.pubkey(),
        }
        .to_account_metas(None),
    );

    assert!(send_instruction(
        &mut svm,
        accept_instruction,
        &worker1
    ));

    // 8. Verify that the blockchain saved the new worker and status.
    let bounty = read_bounty(&svm, &bounty_address);

    assert!(bounty.status == BountyStatus::Accepted);
    assert_eq!(bounty.worker, Some(worker1.pubkey()));

    // 9. Worker 2 attempts to accept the already claimed bounty.
    let second_accept = Instruction::new_with_bytes(
        program_id,
        &bounty_board::instruction::AcceptBounty {}.data(),
        bounty_board::accounts::AcceptBounty {
            bounty: bounty_address,
            worker: worker2.pubkey(),
        }
        .to_account_metas(None),
    );

    assert!(!send_instruction(
        &mut svm,
        second_accept,
        &worker2
    ));

    // 10. Verify the rejected transaction did not change the bounty.
    let bounty = read_bounty(&svm, &bounty_address);

    assert_eq!(bounty.worker, Some(worker1.pubkey()));
    assert!(bounty.status == BountyStatus::Accepted);
}
