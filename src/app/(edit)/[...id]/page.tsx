import Editor from "@/features/editor";

export default async function Page({
	params,
}: { params: Promise<{ id: string[] }> }) {
	const { id } = await params;
	
	// If only one ID provided, treat it as projectId for new flow
	if (id.length === 1) {
		return <Editor projectId={id[0]} />;
	}
	
	// Otherwise use old logic for backward compatibility
	const [sceneId, tempId] = id;
	return <Editor id={sceneId} tempId={tempId} />;
}
