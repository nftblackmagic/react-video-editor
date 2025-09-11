"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
	Upload,
	Loader2,
	FileVideo,
	FileAudio,
	ArrowRight,
	Link2,
	Edit3,
	Smartphone,
	FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import useUploadStore from "../editor/store/use-upload-store";
import useProjectStore from "../editor/store/use-project-store";

const UploadLanding = () => {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [isDragOver, setIsDragOver] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [videoUrl, setVideoUrl] = useState("");
	const [isUploading, setIsUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [projectName, setProjectName] = useState("Untitled Project");

	const { addPendingUploads, processUploads } = useUploadStore();
	const { createProject, projects, refreshProjectList } = useProjectStore();

	// Initialize project list on mount
	React.useEffect(() => {
		refreshProjectList();
	}, [refreshProjectList]);

	const handleFileSelect = (file: File) => {
		// Only accept audio and video files
		if (!file.type.startsWith("audio/") && !file.type.startsWith("video/")) {
			alert("Please select an audio or video file");
			return;
		}
		setSelectedFile(file);
		setVideoUrl(""); // Clear URL if file is selected
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);

		const file = e.dataTransfer.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	};

	const handleStartProject = async () => {
		if (!selectedFile && !videoUrl.trim()) {
			return;
		}

		setIsUploading(true);

		try {
			// Create upload object
			const uploadId = crypto.randomUUID();

			const uploadObject = selectedFile
				? {
						id: uploadId,
						file: selectedFile,
						type: selectedFile.type,
						status: "pending" as const,
						progress: 0,
					}
				: {
						id: uploadId,
						url: videoUrl.trim(),
						type: "url",
						status: "pending" as const,
						progress: 0,
					};

			// Add to pending uploads
			addPendingUploads([uploadObject]);

			// Create project with initial media info
			const initialMedia = {
				url: selectedFile
					? URL.createObjectURL(selectedFile)
					: videoUrl.trim(),
				type: (selectedFile?.type.startsWith("video/")
					? "video"
					: "audio") as "video" | "audio",
				uploadId: uploadId,
				fileName: selectedFile?.name,
				fileSize: selectedFile?.size,
			};

			const project = createProject(
				initialMedia,
				projectName || `Project ${new Date().toLocaleDateString()}`
			);

			// Start processing upload
			setTimeout(() => {
				processUploads();
			}, 0);

			// Simulate upload progress
			const progressInterval = setInterval(() => {
				setUploadProgress((prev) => {
					const newProgress = prev >= 90 ? 90 : prev + 10;
					if (prev >= 90) {
						clearInterval(progressInterval);
					}
					return newProgress;
				});
			}, 200);

			// Navigate to editor with project ID
			setTimeout(() => {
				clearInterval(progressInterval);
				setUploadProgress(100);
				router.push(`/${project.id}`);
			}, 2000);
		} catch (error) {
			console.error("Failed to start project:", error);
			setIsUploading(false);
			alert("Failed to create project. Please try again.");
		}
	};

	const triggerFileInput = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header - matching editor navbar style */}
			<div className="flex h-11 flex-none items-center justify-between border-b px-4">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Input
							className="text-sm font-medium bg-transparent border-none h-7 px-2"
							value={projectName}
							onChange={(e) => setProjectName(e.target.value)}
							placeholder="Untitled Project"
						/>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Button variant="default" size="sm" className="h-7">
						<Upload className="w-3 h-3 mr-1" />
						Upgrade
					</Button>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex items-center justify-center">
				<div className="w-full max-w-4xl px-8 py-12">
					{/* Title */}
					<div className="text-center mb-12">
						<h1 className="text-2xl text-muted-foreground font-normal">
							Name your creation
						</h1>
					</div>

					{/* Main Upload Card */}
					<div className="flex flex-col items-center">
						{/* Upload Area */}
						<div
							className={`
								w-full max-w-md border-2 border-dashed rounded-lg p-8 
								flex flex-col items-center justify-center transition-all
								${
									isDragOver
										? "border-primary bg-primary/5"
										: "border-muted-foreground/30 hover:border-muted-foreground/50"
								}
								${isUploading ? "opacity-50 pointer-events-none" : ""}
							`}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
						>
							<input
								ref={fileInputRef}
								type="file"
								accept="audio/*,video/*"
								onChange={handleFileChange}
								style={{ display: 'none', position: 'absolute', left: '-9999px' }}
							/>

							{selectedFile ? (
								<div className="text-center space-y-4">
									<div className="flex justify-center">
										{selectedFile.type.startsWith("video/") ? (
											<FileVideo className="w-12 h-12 text-muted-foreground" />
										) : (
											<FileAudio className="w-12 h-12 text-muted-foreground" />
										)}
									</div>
									<div>
										<p className="font-medium text-sm">{selectedFile.name}</p>
										<p className="text-xs text-muted-foreground mt-1">
											{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
										</p>
									</div>
									{!isUploading && (
										<Button
											variant="ghost"
											size="sm"
											onClick={(e) => {
												e.stopPropagation();
												triggerFileInput();
											}}
											className="text-xs"
										>
											Choose another file
										</Button>
									)}
								</div>
							) : (
								<div 
									className="text-center space-y-3 cursor-pointer"
									onClick={triggerFileInput}
								>
									<div className="w-12 h-12 mx-auto rounded-lg border border-muted-foreground/30 flex items-center justify-center">
										<FolderOpen className="w-6 h-6 text-muted-foreground/60" />
									</div>
									<div>
										<p className="text-sm font-medium">Upload file</p>
										<p className="text-xs text-muted-foreground mt-1">
											Click to browse
										</p>
										<p className="text-xs text-muted-foreground">
											or drag & drop a file here
										</p>
									</div>
									<Button
										onClick={(e) => {
											e.stopPropagation();
											triggerFileInput();
										}}
										variant="ghost"
										size="sm"
										className="mt-2"
										type="button"
									>
										Browse files
									</Button>
								</div>
							)}
						</div>

						{/* Upload Progress */}
						{isUploading && (
							<div className="w-full max-w-md mt-6 space-y-2">
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<span>Uploading...</span>
									<span>{uploadProgress}%</span>
								</div>
								<Progress value={uploadProgress} className="h-1" />
							</div>
						)}

						{/* Action Buttons Grid */}
						<div className="grid grid-cols-2 gap-4 w-full max-w-2xl mt-8">
							{/* Paste URL Card */}
							<Card 
								className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/20"
								onClick={() => {
									const url = prompt("Paste a video link from YouTube:");
									if (url) {
										setVideoUrl(url);
										setSelectedFile(null);
									}
								}}
							>
								<div className="flex items-center gap-3">
									<Link2 className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm">Paste a video link from YouTube</span>
								</div>
							</Card>

							{/* Write AI Speech Card */}
							<Card className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/20 opacity-50">
								<div className="flex items-center gap-3">
									<Edit3 className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm">Write AI speech</span>
								</div>
							</Card>

							{/* Record Card */}
							<Card className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/20 opacity-50">
								<div className="flex items-center gap-3">
									<div className="w-2 h-2 rounded-full bg-red-500" />
									<span className="text-sm text-red-500">Record</span>
								</div>
							</Card>

							{/* Upload from mobile Card */}
							<Card className="p-6 cursor-pointer hover:bg-muted/50 transition-colors border-muted-foreground/20 opacity-50">
								<div className="flex items-center gap-3">
									<Smartphone className="w-4 h-4 text-muted-foreground" />
									<span className="text-sm">Upload from mobile</span>
								</div>
							</Card>
						</div>

						{/* Alternative text */}
						<div className="text-center mt-8">
							<p className="text-xs text-muted-foreground">
								Paste from clipboard or press Enter to continue with an empty script
							</p>
						</div>

						{/* Continue Button */}
						<Button
							className="mt-8"
							size="lg"
							onClick={handleStartProject}
							disabled={(!selectedFile && !videoUrl.trim()) || isUploading}
							variant={selectedFile || videoUrl ? "default" : "outline"}
							type="button"
						>
							{isUploading ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Creating project...
								</>
							) : (
								<>
									Continue
									{(selectedFile || videoUrl) && (
										<ArrowRight className="w-4 h-4 ml-2" />
									)}
								</>
							)}
						</Button>
					</div>

					{/* Recent Projects */}
					{projects.length > 0 && !isUploading && (
						<div className="mt-16 border-t pt-8">
							<h3 className="text-sm font-medium text-muted-foreground mb-4">
								Recent Projects
							</h3>
							<div className="grid grid-cols-3 gap-4">
								{projects.slice(0, 6).map((project) => (
									<Card
										key={project.id}
										className="p-4 cursor-pointer hover:bg-muted/30 transition-colors border-muted-foreground/20"
										onClick={() => router.push(`/${project.id}`)}
									>
										<div className="aspect-video bg-muted rounded mb-2" />
										<p className="text-sm font-medium truncate">{project.name}</p>
										<p className="text-xs text-muted-foreground">
											{new Date(project.updatedAt).toLocaleDateString()}
										</p>
									</Card>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default UploadLanding;