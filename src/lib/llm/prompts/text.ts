/**
 * Text Processing Prompts
 * Centralized prompt templates for text-related LLM operations
 */

import type { ModelMessage } from "../types";

/**
 * Build messages for article paragraph splitting
 */
export function buildParagraphSplitMessages(article: string): ModelMessage[] {
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
2. Exactly the same as the input article. Do not add any new content. Do not remove any content. Do not change the punctuation. 
3. Analysis: Carefully examine the content, looking for natural breaks in topics, shifts in ideas, or transitions that would indicate appropriate places to start new paragraphs.
4. Division: Split the text at these identified points to create distinct paragraphs. Each paragraph should be a coherent unit of text. Each paragraph length should be almost the same.
5. Review: After dividing the text, review your work to ensure that each paragraph forms a coherent unit and that the division makes sense in the context of the overall article. Do not add any new content.
6. Output format: Present your final result in the following JSON format:

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

export function buildEduCreationMessages(paragraph: string): ModelMessage[] {
	return [
		{
			role: "user",
			content: [
				{
					type: "text",
					text: `You are an expert in Rhetorical Structure Theory (RST). Your task is to analyze the following passage by splitting it into Elementary Discourse Units (EDUs) and assigning a discourse-function tag to each EDU.

Here is the passage to analyze:

<passage>
${paragraph}
</passage>

Follow these guidelines to complete the task:

1. Segmentation: Split the passage into Elementary Discourse Units (EDUs) following the RST definition. An EDU is typically a clause or a simple sentence that expresses a single idea or rhetorical function.

2. Tag set：
BG = Background / Context — sets the scene, definitions, timeline.
CL = Claim / Nucleus — the main assertion the author wants accepted.
EV = Evidence / Data — facts, stats, research, authorities.
EX = Example / Illustration — concrete cases or scenarios.
CS = Concession — acknowledges opposing views/limitations.
RB = Rebuttal — counters or refutes a prior view/point.
IM = Implication / Call-to-Action — consequences, recommendations, next steps.

3. How to apply (concise rules):
Segment EDUs first. Split by clauses/minimal units. Break "Although X, Y" into two EDUs (X and Y).
Prefer a single tag. If truly necessary, allow a primary/secondary pair (e.g., EV[primary] + EX[secondary]).

4. Decision order (quick flow):
Calling for action or stating consequences? → IM
Stating the thesis the audience must accept? → CL
Supporting a claim? → data/research = EV; concrete case = EX
Acknowledging limits/opponents? → CS
Actively countering a view? → RB
None of the above and mostly setting/definitions? → BG

5. Boundary notes & small tweaks:
EX vs EV. Two workable options:
A. Keep both (recommended): research/stats = EV; concrete case = EX.
B. Merge under EV with subtypes, e.g., EV:stat / EV:example.

6. CS vs RB.
Admit but don't counter = CS.
Counter/undercut = RB.
In "Although X, Y": X = CS; Y = RB or CL (if Y is the thesis).

7. BG vs CL.
Ask: "Must the reader accept this proposition to advance the argument?" If yes → CL, else → BG.

8. Scope of IM.
Includes recommendations, policy implications, next steps. If a sentence merely concludes without urging a consequence/action, it likely remains CL or EV (not IM).

9. Optional helpers (project-dependent):
TR = Transition (e.g., "In sum", "Next"), NA = Non-propositional (greetings, IDs, station tags).

10. Labeled paragraph example (EDU → tag):
"Urban noise has worsened in recent years." → BG
"We should improve nighttime construction management." → CL
"City environmental reports show complaints rose 30%." → EV
"For example, one neighborhood reported three incidents in a month." → EX
"Critics say stricter rules could slow projects." → CS
"But multi-site studies find little impact on timelines." → RB
"Therefore, cease high-noise work after 10:00 p.m." → IM


11. Output Requirements:
- Preserve all original text exactly as written, do not add any new content. Do not delete any content.
- Even the punctuation should be preserved. For example, "，" should be preserved as "，". Do not change the punctuation.
- Ensure EDU boundaries align with natural linguistic units
- Each EDU should be self-contained and meaningful

Example analysis:
Input: "Climate change poses significant risks. However, renewable energy offers hope. We must act now."

Expected output:
{{
"edus": [
{{
  "index": 0,
  "content": "Climate change poses significant risks.",
  "tag": "CL",
}},
{{
  "index": 1,
  "content": "这个问题就得到了解决啊。",
  "tag": "CS",
}},
{{
  "index": 2,
  "content": "We must act now.",
  "tag": "IM",
}}
]
}}

Analyze the passage systematically and provide your response in the exact JSON format specified above.`,
				},
			],
		},
	];
}

export function buildGroupEDUsMessages(): ModelMessage[] {
	return [
		{
			role: "system",
			content: `You are an expert in Rhetorical Structure Theory (RST). Your task is to analyze the user provided following JSON format segments, then combine the independent WORDS into Elementary Discourse Units (EDUs).

Here is the JSON format segments example:
{{
full_text: "Hello, World! How are you? 你 好 吗 ？",
word_index: [{"text": "Hello, ", "index": 0}, 
{"text": "World!", "index": 1}, 
{"text": "How", "index": 3}, 
{"text": "are", "index": 4}, 
{"text": "you?", "index": 5}, 
{"text": "你", index: 8}, 
{"text": "好", index: 9}, 
{"text": "吗", index: 10},
{"text": "？", index: 11}]}}


Follow these guidelines to complete the task:
1. The provided input has full_text and word_index. word_index are independent WORDS with index. If we combine all of them, we will get the full_text.
2. You need to split the full_text into Elementary Discourse Units (EDUs). The EDU should be the smallest possible unit.
3. User will provide the segments in multiple rounds because the segments are long. The last Segment will looks like {text: "<END>", index: -1}. You need to combine the segments until the last Segment.
4. If you don't see the <END> or index is -1, the means user will provide the next round of segments. So you can leave the last few segments for the next round to combine if they cannot be combined into a valid EDU.
5. User provided segments are in the order of the original text. However, the index might not always adjacent.

OUTPUT FORMAT:
{{
"groups": [[0, 1, 2], [ 4, 5], [6, 7, 9, 10], [11]]
}}

Example:
Input: [{"text": "Hello, ", "index": 0}, {"text": "World!", "index": 1}, {"text": "How", "index": 3}, {"text": "are", "index": 4}, {"text": "you?", "index": 5}, {"text": "你", index: 8}, {"text": "好", index: 10}, {"text": "吗", index: 11}, {"text": "？", index: 13}]

Output: {
"groups": 
[
[0, 1],                          	//Hello, World! is a EDU.
[3, 4, 5],   						//How are you? is a EDU.
[8, 10, 11, 13] 					//你好吗？ is a EDU.
]}

User will provide the segments as follows:
			`,
		},
	];
}

/**
 * Prompt template collection for text operations
 * Can be extended with more text processing prompts
 */
export const TEXT_PROMPTS = {
	PARAGRAPH_SPLIT: buildParagraphSplitMessages,
	EDU_CREATION: buildEduCreationMessages,
	GROUP_EDUS: buildGroupEDUsMessages,
	// Future prompts can be added here:
	// SUMMARIZE: buildSummarizeMessages,
	// REWRITE: buildRewriteMessages,
	// TRANSLATE: buildTranslateMessages,
} as const;
