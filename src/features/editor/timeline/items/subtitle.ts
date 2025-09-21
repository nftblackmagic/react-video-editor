import { Resizable, ResizableProps } from "@designcombo/timeline";
import { IDisplay } from "@designcombo/types";
import { SECONDARY_FONT } from "../../constants/constants";

interface SubtitleProps extends ResizableProps {
	text: string;
	tScale: number;
	display: IDisplay;
	wordId?: string;
}

class Subtitle extends Resizable {
	static type = "Subtitle";
	declare id: string;
	declare text: string;
	declare wordId?: string;

	constructor(props: SubtitleProps) {
		super(props);
		this.fill = "#305252"; // Same as Text items
		this.id = props.id;
		this.borderColor = "transparent";
		this.stroke = "transparent";
		this.text = props.text;
		this.wordId = props.wordId;
	}

	public _render(ctx: CanvasRenderingContext2D) {
		super._render(ctx);
		this.drawSubtitleContent(ctx);
		this.updateSelected(ctx);
	}

	public drawSubtitleContent(ctx: CanvasRenderingContext2D) {
		// Draw subtitle icon (speech bubble path)
		const subtitleIconPath = new Path2D(
			"M3 4C3 2.89543 3.89543 2 5 2H15C16.1046 2 17 2.89543 17 4V10C17 11.1046 16.1046 12 15 12H8.41421L5.70711 14.7071C5.42111 14.9931 5 14.7903 5 14.3536V12H5C3.89543 12 3 11.1046 3 10V4Z",
		);

		ctx.save();
		ctx.translate(-this.width / 2, -this.height / 2);

		// Draw the word text
		ctx.translate(0, 8);
		ctx.font = `400 12px ${SECONDARY_FONT}`;
		ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
		ctx.textAlign = "left";

		// Clip text to prevent overflow
		ctx.beginPath();
		ctx.rect(36, 0, this.width - 44, 20);
		ctx.clip();

		// Draw the word text
		ctx.fillText(this.text, 36, 12);

		// Reset clip and draw icon
		ctx.restore();
		ctx.save();
		ctx.translate(-this.width / 2, -this.height / 2);
		ctx.translate(8, 7);

		// Draw subtitle icon
		ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
		ctx.fill(subtitleIconPath);

		ctx.restore();
	}
}

export default Subtitle;
