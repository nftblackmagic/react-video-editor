import EditorWithData from "@/features/editor/editor-with-data";
import { loadProjectFromServer } from "../actions/load-project";
import { prepareProjectDataForEditor } from "@/utils/prepare-project-data";

export default async function Page({
	params,
}: { params: Promise<{ id: string[] }> }) {
	const { id } = await params;
	const projectId = id[0];

	// Server-First: Try to load from server/database
	const serverResult = await loadProjectFromServer(projectId);
	
	// Prepare the data if loaded from server
	const preparedData = serverResult.data 
		? prepareProjectDataForEditor(serverResult.data)
		: null;

	// Pass server data to client component
	// Client component will handle fallback to localStorage if needed
	return (
		<EditorWithData 
			projectId={projectId}
			serverData={preparedData}
			dataSource={serverResult.source}
		/>
	);
}
