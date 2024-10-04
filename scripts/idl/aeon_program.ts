/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/aeon_program.json`.
 */
export type AeonProgram = {
  address: "EvLqTE2QVj5TLTz6257ApiUxfu4tc7GHNDYCgN4hQv2c";
  metadata: {
    name: "aeonProgram";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "chargeSol";
      discriminator: [22, 21, 10, 34, 146, 28, 3, 233];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "subscriber";
        },
        {
          name: "subscriberVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "subscriber";
              }
            ];
          };
        },
        {
          name: "recipient";
          writable: true;
        },
        {
          name: "serviceProvider";
        },
        {
          name: "service";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "serviceProvider";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        },
        {
          name: "subscription";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "subscriber";
              },
              {
                kind: "account";
                path: "service";
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        }
      ];
    },
    {
      name: "chargeToken";
      discriminator: [70, 32, 114, 181, 234, 250, 229, 75];
      accounts: [
        {
          name: "signer";
          writable: true;
          signer: true;
        },
        {
          name: "subscriber";
        },
        {
          name: "subscriberVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "subscriber";
              }
            ];
          };
        },
        {
          name: "subscriberVaultAta";
          writable: true;
        },
        {
          name: "recipient";
          writable: true;
        },
        {
          name: "serviceProvider";
        },
        {
          name: "service";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "serviceProvider";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        },
        {
          name: "subscription";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "subscriber";
              },
              {
                kind: "account";
                path: "service";
              }
            ];
          };
        },
        {
          name: "tokenMint";
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        }
      ];
    },
    {
      name: "planAdd";
      discriminator: [210, 145, 227, 112, 195, 70, 100, 83];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "service";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        },
        {
          name: "planInfo";
          type: {
            defined: {
              name: "planInfo";
            };
          };
        }
      ];
    },
    {
      name: "planStatusUpdate";
      discriminator: [12, 170, 234, 223, 53, 189, 82, 156];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "service";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        },
        {
          name: "planId";
          type: "u64";
        },
        {
          name: "isActive";
          type: "bool";
        }
      ];
    },
    {
      name: "serviceCreate";
      discriminator: [7, 33, 72, 164, 134, 162, 82, 238];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "vault";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "service";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "arg";
                path: "id";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "id";
          type: "u64";
        },
        {
          name: "planInfos";
          type: {
            vec: {
              defined: {
                name: "planInfo";
              };
            };
          };
        }
      ];
    },
    {
      name: "serviceStatusUpdate";
      discriminator: [125, 110, 23, 114, 67, 32, 186, 33];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "service";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "arg";
                path: "id";
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "id";
          type: "u64";
        },
        {
          name: "isActive";
          type: "bool";
        }
      ];
    },
    {
      name: "subscribeSol";
      discriminator: [162, 188, 75, 21, 198, 172, 212, 16];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "subscriber";
          writable: true;
          signer: true;
        },
        {
          name: "subscriberVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "subscriber";
              }
            ];
          };
        },
        {
          name: "serviceProvider";
        },
        {
          name: "service";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "serviceProvider";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        },
        {
          name: "recipient";
          writable: true;
        },
        {
          name: "subscription";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "subscriber";
              },
              {
                kind: "account";
                path: "service";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        },
        {
          name: "planId";
          type: "u64";
        }
      ];
    },
    {
      name: "subscribeToken";
      discriminator: [244, 137, 178, 223, 160, 204, 79, 91];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "subscriber";
          writable: true;
          signer: true;
        },
        {
          name: "subscriberVault";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "subscriber";
              }
            ];
          };
        },
        {
          name: "subscriberVaultAta";
          writable: true;
        },
        {
          name: "serviceProvider";
        },
        {
          name: "service";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "serviceProvider";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        },
        {
          name: "tokenMint";
        },
        {
          name: "recipient";
          writable: true;
        },
        {
          name: "subscription";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "subscriber";
              },
              {
                kind: "account";
                path: "service";
              }
            ];
          };
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        },
        {
          name: "planId";
          type: "u64";
        }
      ];
    },
    {
      name: "unsubscribe";
      discriminator: [12, 90, 197, 207, 214, 187, 199, 198];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "subscriber";
          writable: true;
          signer: true;
        },
        {
          name: "serviceProvider";
        },
        {
          name: "service";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [115, 101, 114, 118, 105, 99, 101];
              },
              {
                kind: "account";
                path: "serviceProvider";
              },
              {
                kind: "arg";
                path: "serviceId";
              }
            ];
          };
        },
        {
          name: "subscription";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [
                  115,
                  117,
                  98,
                  115,
                  99,
                  114,
                  105,
                  112,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "subscriber";
              },
              {
                kind: "account";
                path: "service";
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "serviceId";
          type: "u64";
        }
      ];
    },
    {
      name: "vaultCreate";
      discriminator: [109, 191, 172, 125, 83, 225, 56, 122];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "initBalance";
          type: "u64";
        }
      ];
    },
    {
      name: "vaultWithdrawSol";
      discriminator: [49, 168, 220, 252, 55, 26, 14, 62];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "destination";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    },
    {
      name: "vaultWithdrawToken";
      discriminator: [117, 156, 253, 162, 122, 167, 119, 28];
      accounts: [
        {
          name: "feePayer";
          writable: true;
          signer: true;
        },
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "vault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 101, 111, 110];
              },
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "tokenMint";
        },
        {
          name: "vaultAta";
          writable: true;
        },
        {
          name: "destinationAta";
          writable: true;
        },
        {
          name: "tokenProgram";
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "amount";
          type: "u64";
        }
      ];
    }
  ];
  accounts: [
    {
      name: "service";
      discriminator: [144, 62, 76, 129, 167, 36, 151, 250];
    },
    {
      name: "subscription";
      discriminator: [64, 7, 26, 135, 102, 132, 98, 33];
    },
    {
      name: "vault";
      discriminator: [211, 8, 232, 43, 2, 152, 117, 119];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "vaultRentExemptError";
      msg: "Vault lamports cannot go below minimum rent";
    },
    {
      code: 6001;
      name: "ataNotOwnedByVault";
      msg: "The specified vault token account is not owned by the owner vault";
    },
    {
      code: 6002;
      name: "invalidArgument";
      msg: "Invalid argument";
    },
    {
      code: 6003;
      name: "planNotFound";
      msg: "Plan not found";
    },
    {
      code: 6004;
      name: "inactiveService";
      msg: "Service is not active";
    },
    {
      code: 6005;
      name: "inactivePlan";
      msg: "Plan is not active";
    },
    {
      code: 6006;
      name: "inactiveSubscription";
      msg: "Subscription is not active";
    },
    {
      code: 6007;
      name: "insufficientVaultBalance";
      msg: "Insufficient balance for subscription";
    },
    {
      code: 6008;
      name: "recipientMismatch";
      msg: "Subscription recipient mismatch";
    },
    {
      code: 6009;
      name: "nextChargeTsNotReached";
      msg: "Next charge ts not reached";
    }
  ];
  types: [
    {
      name: "plan";
      type: {
        kind: "struct";
        fields: [
          {
            name: "id";
            type: "u64";
          },
          {
            name: "chargeAmount";
            type: "u64";
          },
          {
            name: "createdAt";
            type: "u64";
          },
          {
            name: "interval";
            type: "u64";
          },
          {
            name: "tokenMint";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "recipient";
            type: "pubkey";
          },
          {
            name: "isActive";
            type: "bool";
          }
        ];
      };
    },
    {
      name: "planInfo";
      type: {
        kind: "struct";
        fields: [
          {
            name: "chargeAmount";
            type: "u64";
          },
          {
            name: "interval";
            type: "u64";
          },
          {
            name: "tokenMint";
            type: {
              option: "pubkey";
            };
          },
          {
            name: "recipient";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "service";
      type: {
        kind: "struct";
        fields: [
          {
            name: "id";
            type: "u64";
          },
          {
            name: "createdAt";
            type: "u64";
          },
          {
            name: "createdBy";
            type: "pubkey";
          },
          {
            name: "isActive";
            type: "bool";
          },
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "plans";
            type: {
              vec: {
                defined: {
                  name: "plan";
                };
              };
            };
          }
        ];
      };
    },
    {
      name: "subscription";
      type: {
        kind: "struct";
        fields: [
          {
            name: "serviceKey";
            type: "pubkey";
          },
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "planId";
            type: "u64";
          },
          {
            name: "lastChargeTs";
            type: "u64";
          },
          {
            name: "nextChargeTs";
            type: "u64";
          },
          {
            name: "isActive";
            type: "bool";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    },
    {
      name: "vault";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "bump";
            type: "u8";
          }
        ];
      };
    }
  ];
};
