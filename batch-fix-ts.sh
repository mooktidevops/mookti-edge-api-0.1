#!/bin/bash

echo "Batch fixing TypeScript errors..."

# Fix maxTokens → maxRetries in AI SDK calls
find api/ -name "*.ts" -exec sed -i '' 's/maxTokens:/maxRetries:/' {} \;

# Fix toDataStreamResponse → toTextStreamResponse
find api/ -name "*.ts" -exec sed -i '' 's/toDataStreamResponse/toTextStreamResponse/' {} \;

# Fix promptTokens → totalTokens
find api/ -name "*.ts" -exec sed -i '' 's/promptTokens/totalTokens/' {} \;
find api/ -name "*.ts" -exec sed -i '' 's/completionTokens/totalTokens/' {} \;

# Fix verifyAuth imports that were missed
find api/storage -name "*.ts" -exec sed -i '' 's/verifyApiAuth/verifyAuth/' {} \;
find lib/ -name "*.ts" -exec sed -i '' 's/verifyAuth/verifyApiAuth/' {} \;

echo "Done!"
