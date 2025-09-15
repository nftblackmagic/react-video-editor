/**
 * Debug script for testing processArticle function
 * Run with: tsx src/lib/llm/debug/test-process-article.ts
 */

import { config } from "dotenv";
import { processArticle } from "../operations/text-operations";

// Load environment variables
config();

// Sample test articles
const TEST_ARTICLES = {
	short:
		"Climate change is one of the most pressing issues of our time. Rising temperatures are causing widespread environmental damage. We must take immediate action to reduce emissions.",

	medium:
		"The rapid advancement of artificial intelligence has transformed numerous industries. In healthcare, AI systems now assist doctors in diagnosing diseases with unprecedented accuracy. Financial institutions use machine learning algorithms to detect fraud and optimize trading strategies. However, these developments also raise important ethical questions. We must ensure that AI systems are transparent and fair. Privacy concerns need to be addressed as these systems process vast amounts of personal data. Despite these challenges, the potential benefits are enormous. Governments and organizations must work together to create appropriate regulatory frameworks.",

	long: `The digital transformation of education has accelerated dramatically in recent years. Traditional classroom settings are being supplemented with online learning platforms that offer unprecedented flexibility. Students can now access world-class education from anywhere in the world. However, this shift has also highlighted significant disparities in digital access. Many students in rural or economically disadvantaged areas lack reliable internet connectivity. Educational institutions must address these inequalities to ensure that all students can benefit from digital learning opportunities.

Moreover, the role of teachers is evolving in this new landscape. Educators are no longer just information providers but facilitators of learning experiences. They must develop new skills to effectively engage students in virtual environments. Professional development programs are essential to help teachers adapt to these changes. The integration of technology should enhance, not replace, the human connection that is fundamental to education.

Looking forward, hybrid learning models that combine online and in-person instruction may become the norm. This approach could offer the best of both worlds: the flexibility of online learning and the social interaction of traditional classrooms. Educational policies must be updated to support these new models. Investment in infrastructure and teacher training will be crucial for success. The future of education depends on our ability to adapt and innovate while maintaining quality and accessibility for all learners.`,

	chinese:
		"城市噪音问题近年来日益严重。我们应该改善夜间施工管理。城市环境报告显示投诉量上升了30%。例如，某社区一个月内报告了三起事件。批评者说更严格的规则可能会减缓项目进度。但多地研究发现对时间线影响很小。因此，晚上10点后应停止高噪音作业。",
};

async function testProcessArticle(articleName: keyof typeof TEST_ARTICLES) {
	console.log(`\n${"=".repeat(50)}`);
	console.log(`Testing article: ${articleName}`);
	console.log(`${"=".repeat(50)}\n`);

	const article = TEST_ARTICLES[articleName];
	console.log("Input Article:");
	console.log(article);
	console.log(`\n${"-".repeat(50)}\n`);

	try {
		console.log("Processing article...\n");
		const startTime = Date.now();

		const result = await processArticle(article, []);

		const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
		console.log(`✅ Processing completed in ${processingTime} seconds\n`);

		console.log("EDUs Generated:");
		console.log("-".repeat(50));

		result.edus.forEach((edu, idx) => {
			console.log(`\nEDU ${idx + 1}:`);
			console.log(`  Index: ${edu.index}`);
			console.log(`  Tag: ${edu.tag}`);
			console.log(`  Content: "${edu.content}"`);
		});

		console.log(`\n${"-".repeat(50)}`);
		console.log(`Total EDUs: ${result.edus.length}`);

		// Validation checks
		console.log("\n📊 Validation Results:");
		const originalText = article.replace(/\s+/g, " ").trim();
		const reconstructed = result.edus
			.map((edu) => edu.content)
			.join(" ")
			.replace(/\s+/g, " ")
			.trim();

		if (originalText === reconstructed) {
			console.log("✅ Text integrity maintained");
		} else {
			console.log("❌ Text integrity check failed");
			console.log("Original length:", originalText.length);
			console.log("Reconstructed length:", reconstructed.length);
		}

		// Check for continuous indexing
		const indexesValid = result.edus.every(
			(edu, idx) => idx === 0 || edu.index > result.edus[idx - 1].index,
		);
		if (indexesValid) {
			console.log("✅ EDU indexes are properly ordered");
		} else {
			console.log("❌ EDU index ordering issue detected");
		}

		return result;
	} catch (error) {
		console.error("❌ Error processing article:", error);
		throw error;
	}
}

// Main execution
async function main() {
	// Check for required environment variables
	if (!process.env.OPENAI_API_KEY) {
		console.error("❌ OPENAI_API_KEY environment variable is not set");
		process.exit(1);
	}

	console.log("🚀 Starting processArticle tests\n");

	// Test with different articles
	const testCases: Array<keyof typeof TEST_ARTICLES> = ["long"];
	// Uncomment to test more cases:
	// const testCases: Array<keyof typeof TEST_ARTICLES> = ["short", "medium", "long", "chinese"];

	for (const testCase of testCases) {
		try {
			await testProcessArticle(testCase);
		} catch (error) {
			console.error(`Failed to process ${testCase} article:`, error);
		}
	}

	console.log("\n✨ All tests completed!");
}

// Run if executed directly
if (require.main === module) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}

export { testProcessArticle, TEST_ARTICLES };
