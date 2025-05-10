#!/bin/bash
cd anchor-game-contracts/mint_nft
anchor build
anchor deploy --provider.cluster devnet
