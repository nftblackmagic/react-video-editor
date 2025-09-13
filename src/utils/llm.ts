import { openai } from "@ai-sdk/openai";
import { generateObject, ModelMessage } from "ai";
import { z } from "zod";

function _build_article_paragraph_split_messages(
	article: string,
): ModelMessage[] {
	return [
		{
			role: "user",
			content: [
				{
					type: "text",
					text: `You are an AI assistant specialized in article division. Your task is to split a given passage into paragraphs according to specific guidelines. Here's what you need to do:

First, carefully read the following input article:

<article>
${article}
</article>

Now, follow these guidelines to complete the task:

1. Segmentation: Based on the article structure, divide the article into paragraphs. Do not create or invent any new content - use only the text provided in the input article.

2. Analysis: Carefully examine the content, looking for natural breaks in topics, shifts in ideas, or transitions that would indicate appropriate places to start new paragraphs.

3. Division: Split the text at these identified points to create distinct paragraphs. Each paragraph should be a coherent unit of text. Each paragraph length should be almost the same.

4. Review: After dividing the text, review your work to ensure that each paragraph forms a coherent unit and that the division makes sense in the context of the overall article. Do not add any new content.

5. Output format: Present your final result in the following JSON format:

{{
"paragraphs": [
"paragraph 1",
"paragraph 2",
...
]
}}

Important reminders:
- Ensure you create paragraphs, no more and no less.
- Do not add, remove, or modify any of the original text. Your task is solely to divide the existing content.
- Make sure each paragraph is a coherent unit of text.
- Double-check that your output adheres to the specified JSON format.

Please proceed with the task and provide your response in the format specified above.`,
				},
			],
		},
	];
}

export async function articleParagraphSplit(article: string) {
	const messages = _build_article_paragraph_split_messages(article);
	const result = await generateObject({
		model: openai("o3"),
		messages: messages,
		schema: z.object({
			paragraphs: z.array(z.string()),
		}),
	});
	return result.object.paragraphs;
}
