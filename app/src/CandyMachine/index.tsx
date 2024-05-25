import React, { useEffect, useState } from "react";
import { Idl, Program, Provider, web3 } from "@project-serum/anchor";
import { ConfirmOptions, Connection, PublicKey } from "@solana/web3.js";
import { MintLayout, TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import { sendTransactions } from "./connection";
import "./CandyMachine.css";
import {
  candyMachineProgram,
  TOKEN_METADATA_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getAtaForMint,
  getNetworkExpire,
  getNetworkToken,
  CIVIC,
} from "./helpers";
import CountdownTimer from "../CountdownTimer";
import { programs } from "@metaplex/js";
import { bs58 } from "@project-serum/anchor/dist/cjs/utils/bytes";

const { SystemProgram } = web3;

interface CandyMachineState {
  id: string;
  program: Program<Idl>;
  state: {
    itemsAvailable: any;
    itemsRedeemed: any;
    itemsRemaining: number;
    goLiveData: any;
    goLiveDateTimeString: string;
    isSoldOut: boolean;
    isActive: any;
    isPresale: any;
    goLiveDate: any;
    treasury: any;
    tokenMint: any;
    gatekeeper: any;
    whitelistMintSettings: any;
    hiddenSettings: any;
    price: any;
  };
}

const {
  metadata: { Metadata, MetadataProgram },
} = programs;

const opts: ConfirmOptions = {
  preflightCommitment: "processed",
};

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 2 + 1 + 4 + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START = 1 + 32 + 32 + 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 4 + MAX_SYMBOL_LENGTH + 2 + 1 + 4;

const TOKEN_METADATA_PROGRAM = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const CANDY_MACHINE_V2_PROGRAM = new PublicKey('cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ');
const candyMachineId = new PublicKey('4nGKi7C6mK751LtQSRqB3ashWttu1VhDddhHCZAFXUGC');

const CandyMachine = ({ walletAddress }) => {
  const [candyMachine, setCandyMachine] = useState<
    CandyMachineState | undefined
  >(undefined);
  const [mintsAddress, setMintsAddress] = useState<any[]>([]);
  const [isLoadingMints, setIsLoadingMints] = useState(false);

  const getMintAddresses = async (firstCreatorAddress: PublicKey) => {
    const connection = new web3.Connection(
      process.env.REACT_APP_SOLANA_RPC_HOST!
    );
    const metadataAccounts = await connection.getProgramAccounts(TOKEN_METADATA_PROGRAM, {
      dataSlice: {offset: 33, length: 32},
      filters: [
        {dataSize: MAX_METADATA_LEN},

        {memcmp: {
          offset: CREATOR_ARRAY_START,
          bytes: firstCreatorAddress.toBase58(),
        }}
      ]
    });

    return metadataAccounts.map((metadataAccountInfo) => (
      bs58.encode(metadataAccountInfo.account.data)
    ));
  };

  const getCandyMachineCreator = async (candyMachine: PublicKey): Promise<[PublicKey, number]> => (
    PublicKey.findProgramAddress(
      [Buffer.from('candy_machine'), candyMachine.toBuffer()],
      CANDY_MACHINE_V2_PROGRAM,
    )
  );

  const getProvider = () => {
    const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;
    // Create a new connection object
    const connection = new Connection(rpcHost!);

    // create a new Solana provider object
    const provider = new Provider(connection, window.solana, opts);

    return provider;
  };

  // Declare getCandyMachineState as an async method
  const getCandyMachineState = async () => {
    const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;
    const connection = new Connection(rpcHost!);
    const provider = getProvider();

    // Get metadata about your deployed candy machine program
    const idl = await Program.fetchIdl(candyMachineProgram, provider);

    // Create a program that you can call
    const program = new Program(idl!, candyMachineProgram, provider);

    // Fetch the metadata from your candy machine
    const candyMachine = await program.account.candyMachine.fetch(
      process.env.REACT_APP_CANDY_MACHINE_ID!
    );

    // Parse out all our metadata and log it out
    const itemsAvailable = candyMachine.data.itemsAvailable.toNumber();
    const itemsRedeemed = candyMachine.itemsRedeemed.toNumber();
    const itemsRemaining = itemsAvailable - itemsRedeemed;
    const goLiveData = candyMachine.data.goLiveDate.toNumber();
    const presale =
      candyMachine.data.whitelistMintSettings &&
      candyMachine.data.whitelistMintSettings.presale &&
      (!candyMachine.data.goLiveDate ||
        candyMachine.data.goLiveDate.toNumber() > new Date().getTime() / 1000);

    // We will be using this later in our UI so let's generate this now
    const goLiveDateTimeString = `${new Date(
      goLiveData * 1000
    ).toUTCString()} @ ${new Date(goLiveData * 1000).toLocaleTimeString()}`;

    setCandyMachine({
      id: process.env.REACT_APP_CANDY_MACHINE_ID!,
      program,
      state: {
        itemsAvailable,
        itemsRedeemed,
        itemsRemaining,
        goLiveData,
        goLiveDateTimeString,
        isSoldOut: itemsRemaining === 0,
        isActive:
          (presale ||
            candyMachine.data.goLiveDate.toNumber() <
              new Date().getTime() / 10000) &&
          (candyMachine.endSettings
            ? candyMachine.endSettings.endSettingType.date
              ? candyMachine.endSettings.number.toNumber() >
                new Date().getTime() / 1000
              : itemsRedeemed < candyMachine.endSettings.number.toNumber()
            : true),
        isPresale: presale,
        goLiveDate: candyMachine.data.goLiveDate,
        treasury: candyMachine.wallet,
        tokenMint: candyMachine.tokenMint,
        gatekeeper: candyMachine.data.endSettings,
        whitelistMintSettings: candyMachine.data.whitelistMintSettings,
        hiddenSettings: candyMachine.data.hiddenSettings,
        price: candyMachine.data.price,
      },
    });

    setIsLoadingMints(true);

    const candyMachineCreator = await getCandyMachineCreator(candyMachineId);
    const data = await getMintAddresses(candyMachineCreator[0]);

    console.log(data);
    if (data.length !== 0) {
      let mintSets: string[] = [];
      for (const mint of data) {
        const metadataPDA = await Metadata.getPDA(new PublicKey(mint));
        const tokenMetadata = await Metadata.load(connection, metadataPDA);

        // Get image URI
        const response = await fetch(tokenMetadata.data.data.uri);
        const parse = await response.json();
        mintSets.push(parse.image);
        // mintSet.add(parse.image);
      }
      console.log("Mint set: ", mintSets);
      setMintsAddress(mintSets);
      
    }
    setIsLoadingMints(false);
    console.log(mintsAddress);
  };

  const getMetadata = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const getMasterEdition = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress,
    payer,
    walletAddress,
    splTokenMintAddress
  ) => {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: web3.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    return new web3.TransactionInstruction({
      keys,
      programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      data: Buffer.from([]),
    });
  };

  const mintToken = async () => {
    const mint = web3.Keypair.generate();

    const userTokenAccountAddress = (
      await getAtaForMint(mint.publicKey, walletAddress.publicKey)
    )[0];

    const userPayingAccountAddress = candyMachine!.state.tokenMint
      ? (
          await getAtaForMint(
            candyMachine!.state.tokenMint,
            walletAddress.publicKey
          )
        )[0]
      : walletAddress.publicKey;

    const candyMachineAddress = candyMachine!.id;
    const remainingAccounts: any = [];
    const signers = [mint];
    const cleanupInstructions = [];
    const instructions = [
      web3.SystemProgram.createAccount({
        fromPubkey: walletAddress.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await candyMachine!.program.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        0,
        walletAddress.publicKey,
        walletAddress.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        userTokenAccountAddress,
        walletAddress.publicKey,
        walletAddress.publicKey,
        mint.publicKey
      ),
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        userTokenAccountAddress,
        walletAddress.publicKey,
        [],
        1
      ),
    ];

    if (candyMachine!.state.gatekeeper) {
      remainingAccounts.push({
        pubkey: (
          await getNetworkToken(
            walletAddress.publicKey,
            candyMachine!.state.gatekeeper.gatekeeperNetwork
          )
        )[0],
        isWritable: true,
        isSigner: false,
      });
      if (candyMachine!.state.gatekeeper.expireOnUse) {
        remainingAccounts.push({
          pubkey: CIVIC,
          isWritable: false,
          isSigner: false,
        });
        remainingAccounts.push({
          pubkey: (
            await getNetworkExpire(
              candyMachine!.state.gatekeeper.gatekeeperNetwork
            )
          )[0],
          isWritable: false,
          isSigner: false,
        });
      }
    }
    if (candyMachine!.state.whitelistMintSettings) {
      const mint = new web3.PublicKey(
        candyMachine!.state.whitelistMintSettings.mint
      );

      const whitelistToken = (
        await getAtaForMint(mint, walletAddress.publicKey)
      )[0];
      remainingAccounts.push({
        pubkey: whitelistToken,
        isWritable: true,
        isSigner: false,
      });

      if (candyMachine!.state.whitelistMintSettings.mode.burnEveryTime) {
        const whitelistBurnAuthority = web3.Keypair.generate();

        remainingAccounts.push({
          pubkey: mint,
          isWritable: true,
          isSigner: false,
        });
        remainingAccounts.push({
          pubkey: whitelistBurnAuthority.publicKey,
          isWritable: false,
          isSigner: true,
        });
        signers.push(whitelistBurnAuthority);
        const exists =
          await candyMachine!.program.provider.connection.getAccountInfo(
            whitelistToken
          );
        if (exists) {
          instructions.push(
            Token.createApproveInstruction(
              TOKEN_PROGRAM_ID,
              whitelistToken,
              whitelistBurnAuthority.publicKey,
              walletAddress.publicKey,
              [],
              1
            )
          );
          cleanupInstructions.push(
            // @ts-ignore
            Token.createRevokeInstruction(
              TOKEN_PROGRAM_ID,
              whitelistToken,
              walletAddress.publicKey,
              []
            )
          );
        }
      }
    }

    if (candyMachine!.state.tokenMint) {
      const transferAuthority = web3.Keypair.generate();

      signers.push(transferAuthority);
      remainingAccounts.push({
        pubkey: userPayingAccountAddress,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: transferAuthority.publicKey,
        isWritable: false,
        isSigner: true,
      });

      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          userPayingAccountAddress,
          transferAuthority.publicKey,
          walletAddress.publicKey,
          [],
          candyMachine!.state.price.toNumber()
        )
      );
      cleanupInstructions.push(
        // @ts-ignore
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          userPayingAccountAddress,
          walletAddress.publicKey,
          []
        )
      );
    }
    const metadataAddress = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);

    const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
      candyMachineId
    );

    instructions.push(
      await candyMachine!.program.instruction.mintNft(creatorBump, {
        accounts: {
          candyMachine: candyMachineAddress,
          candyMachineCreator,
          payer: walletAddress.publicKey,
          wallet: candyMachine!.state.treasury,
          mint: mint.publicKey,
          metadata: metadataAddress,
          masterEdition,
          mintAuthority: walletAddress.publicKey,
          updateAuthority: walletAddress.publicKey,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          recentBlockhashes: web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          instructionSysvarAccount: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        remainingAccounts:
          remainingAccounts.length > 0 ? remainingAccounts : undefined,
      })
    );

    try {
      return (
        
        (
          // @ts-ignore
          await sendTransactions(
            candyMachine!.program.provider.connection,
            candyMachine!.program.provider.wallet,
            [instructions, cleanupInstructions],
            [signers, []]
          )
        ).txs.map((t) => t["txid"])
      );
    } catch (e) {
      console.log(e);
    }
    return [];
  };

  useEffect(() => {
    getCandyMachineState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderDropTimer = () => {
    // Get the current date and dropDate in a JavaScript Date object
    const currentDate = new Date();
    const dropDate = new Date(candyMachine?.state.goLiveData * 1000);

    // If currentDate is before dropDate, render our CountDown component
    if (currentDate < dropDate) {
      console.log("Before drop date!");
      // Don't forget to pass over your dropDate!
      return <CountdownTimer dropDate={dropDate} />;
    }

    // Else let's just return the current drop ddate
    return <p>{`Drop Date: ${candyMachine?.state.goLiveDateTimeString}`}</p>;
  };

  return (
    <>
      {candyMachine && candyMachine?.state && (
        <div className="machine-container">
          {renderDropTimer()}
          <p>{`Items Minted: ${candyMachine.state.itemsRedeemed} / ${candyMachine.state.itemsAvailable}`}</p>
          {candyMachine.state.itemsRedeemed ===
          candyMachine.state.itemsAvailable ? (
            <p className="sub-text">Sold out</p>
          ) : (
            <button className="cta-button mint-button" onClick={mintToken}>
              Mint NFT
            </button>
          )}
          <div className="gif-container">
          {isLoadingMints ? <p className="sub-text">LOADING MINTS..</p> : <p className="sub-text">Minted Items</p>}
            <div className="gif-grid">
              {mintsAddress.map((mint) => {
                console.log("Mints: ", mint);
                return (
                  <div className="gif-item" key={mint}>
                    <img src={mint} alt={`Minted NFT ${mint}`} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CandyMachine;
