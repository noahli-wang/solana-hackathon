/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/bounty_board.json`.
 */
export type BountyBoard = {
  "address": "DorphgTj2n5swnnt53Edymkds7P1MDjoKfQRRNC79weT",
  "metadata": {
    "name": "bountyBoard",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "acceptBounty",
      "discriminator": [
        165,
        37,
        99,
        130,
        123,
        244,
        67,
        35
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bounty.creator",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.bountyId",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "worker",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "approveBounty",
      "discriminator": [
        159,
        69,
        100,
        84,
        88,
        57,
        93,
        29
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bounty.creator",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.bountyId",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "creator",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "cancelBounty",
      "discriminator": [
        79,
        65,
        107,
        143,
        128,
        165,
        135,
        46
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bounty.creator",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.bountyId",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "creator",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createBounty",
      "discriminator": [
        122,
        90,
        14,
        143,
        8,
        125,
        200,
        2
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "bountyId"
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "bountyId",
          "type": "u64"
        },
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "descriptionRef",
          "type": "string"
        },
        {
          "name": "rewardLamports",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "i64"
        }
      ]
    },
    {
      "name": "increment",
      "discriminator": [
        11,
        18,
        104,
        9,
        104,
        174,
        59,
        33
      ],
      "accounts": [
        {
          "name": "counter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "counter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "submitWork",
      "discriminator": [
        158,
        80,
        101,
        51,
        114,
        130,
        101,
        253
      ],
      "accounts": [
        {
          "name": "bounty",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  111,
                  117,
                  110,
                  116,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "bounty.creator",
                "account": "bounty"
              },
              {
                "kind": "account",
                "path": "bounty.bountyId",
                "account": "bounty"
              }
            ]
          }
        },
        {
          "name": "worker",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "submissionRef",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "bounty",
      "discriminator": [
        237,
        16,
        105,
        198,
        19,
        69,
        242,
        234
      ]
    },
    {
      "name": "counter",
      "discriminator": [
        255,
        176,
        4,
        245,
        188,
        253,
        124,
        25
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Only the counter authority can update this counter"
    },
    {
      "code": 6001,
      "name": "counterOverflow",
      "msg": "Counter has reached the maximum value"
    },
    {
      "code": 6002,
      "name": "invalidTitle",
      "msg": "Title must contain between 1 and 64 bytes"
    },
    {
      "code": 6003,
      "name": "invalidReward",
      "msg": "Reward must be greater than zero"
    },
    {
      "code": 6004,
      "name": "invalidDescription",
      "msg": "Invalid description reference"
    },
    {
      "code": 6005,
      "name": "invalidDeadline",
      "msg": "Deadline must be in the future"
    },
    {
      "code": 6006,
      "name": "bountyNotOpen",
      "msg": "Bounty is not open"
    },
    {
      "code": 6007,
      "name": "bountyExpired",
      "msg": "Bounty deadline has passed"
    },
    {
      "code": 6008,
      "name": "cannotAcceptOwnBounty",
      "msg": "Creator cannot accept their own bounty"
    },
    {
      "code": 6009,
      "name": "invalidStatus",
      "msg": "Bounty is not in the right status for this action"
    },
    {
      "code": 6010,
      "name": "notBountyCreator",
      "msg": "Only the creator of the bounty can perform this action"
    },
    {
      "code": 6011,
      "name": "notCreator",
      "msg": "Only the bounty creator can do this"
    },
    {
      "code": 6012,
      "name": "wrongWorker",
      "msg": "Only the assigned worker can do this"
    },
    {
      "code": 6013,
      "name": "bountyNotAccepted",
      "msg": "Bounty must be accepted before submitting work"
    },
    {
      "code": 6014,
      "name": "unauthorizedWorker",
      "msg": "Only the assigned worker can submit work"
    },
    {
      "code": 6015,
      "name": "invalidSubmission",
      "msg": "Submission reference must contain between 1 and 200 bytes"
    },
    {
      "code": 6016,
      "name": "workNotSubmitted",
      "msg": "Work has not been submitted yet"
    },
    {
      "code": 6017,
      "name": "cannotCancel",
      "msg": "Bounty can only be cancelled while open, or after the deadline if work has not been submitted"
    },
    {
      "code": 6018,
      "name": "insufficientEscrow",
      "msg": "Bounty account does not hold enough lamports to pay the reward"
    }
  ],
  "types": [
    {
      "name": "bounty",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "worker",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "bountyId",
            "type": "u64"
          },
          {
            "name": "rewardLamports",
            "type": "u64"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "descriptionRef",
            "type": "string"
          },
          {
            "name": "deadline",
            "type": "i64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "bountyStatus"
              }
            }
          },
          {
            "name": "submissionRef",
            "type": {
              "option": "string"
            }
          }
        ]
      }
    },
    {
      "name": "bountyStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "accepted"
          },
          {
            "name": "submitted"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "counter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "counterSeed",
      "type": "bytes",
      "value": "[99, 111, 117, 110, 116, 101, 114]"
    },
    {
      "name": "helloWorldLamports",
      "type": "u64",
      "value": "1"
    },
    {
      "name": "maxCount",
      "type": "u64",
      "value": "10"
    }
  ]
};
