# LLM Debug Scripts

This folder contains debug and test scripts for the LLM service functions.

## Available Scripts

### test-process-article.ts
Tests the `processArticle` function that splits articles into paragraphs and then into Elementary Discourse Units (EDUs).

## Running Tests

Make sure you have the required environment variables set:
```bash
# Required
OPENAI_API_KEY=your-openai-api-key
```

Run the test script:
```bash
# Using tsx (recommended)
pnpm tsx src/lib/llm/debug/test-process-article.ts

# Or using npx
npx tsx src/lib/llm/debug/test-process-article.ts
```

## Test Cases

The script includes several pre-defined test articles:
- **short**: A brief 3-sentence article about climate change
- **medium**: A paragraph about AI transformation
- **long**: A multi-paragraph article about digital education
- **chinese**: A Chinese language article about urban noise

## Output

The test script will:
1. Display the input article
2. Process it through the LLM
3. Show all generated EDUs with their tags
4. Validate text integrity (ensures no content is lost)
5. Check EDU index ordering

## Modifying Tests

To test different articles, edit the `testCases` array in the main function:
```typescript
// Test single article
const testCases: Array<keyof typeof TEST_ARTICLES> = ["short"];

// Test multiple articles
const testCases: Array<keyof typeof TEST_ARTICLES> = ["short", "medium", "long", "chinese"];
```

You can also add new test articles to the `TEST_ARTICLES` object.

## EDU Tags

The system uses the following discourse-function tags:
- **BG**: Background/Context
- **CL**: Claim/Nucleus (main assertion)
- **EV**: Evidence/Data
- **EX**: Example/Illustration
- **CS**: Concession (acknowledges opposing views)
- **RB**: Rebuttal (counters a view)
- **IM**: Implication/Call-to-Action