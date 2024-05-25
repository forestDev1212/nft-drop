# Solana NFT Drop Project

## Description

![image](app/src/assets/wallpaper.png)

## Tech Stack

- TypeScript, React.js, Metaplex, Candy Machine v2
- App works on only Solana devnet

## Usage

1. Deploy Contract

```bash
$ ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts upload -e devnet -k ~/.config/solana/devnet.json -cp config.json ./assets
# If you want to update contract `ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts update_candy_machine -e devnet -k ~/.config/solana/devnet.json -cp config.json`
```

2. Verify

```bash
$ ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts verify_upload -e devnet -k ~/.config/solana/devnet.json
```

3. Edit your environment variables

```bash
# rename env file
$ mv .env.sample .env
```

4. Start frontend server

```bash
# cd into `app` folder
$ cd app

# install dependencies
$ yarn

# start frontend server
$ yarn dev
```

## References

1. https://solanacookbook.com/references/nfts.html#how-to-create-an-nft
2. https://stackoverflow.com/questions/70597753/how-to-find-all-nfts-minted-from-a-v2-candy-machine
3. https://www.metaplex.com/learn-developers

## What is the .vscode Folder?
If you use VSCode to build your app, we included a list of suggested extensions that will help you build this project! Once you open this project in VSCode, you will see a popup asking if you want to download the recommended extensions :).

## Questions?
Have some questions make sure you head over to your [buildspace Dashboard](https://app.buildspace.so/projects/CO77556be5-25e9-49dd-a799-91a2fc29520e) and link your Discord account so you can get access to helpful channels and your instructor!

"# nft-drop" 
