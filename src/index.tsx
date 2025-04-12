import miniReact from "./miniReact";

function App(props: { name: string }) {
	const [state, setState] = miniReact.useState(0);
	const handleClick = () => {
		setState(state + 1);
	};
	return (
		<>
			{/*  差分解析(PLACEMENT,DELETION)を確認  */}
			{state === 2 ? <div>{props.name} count is 2</div> : null}
			<button type="button" onClick={handleClick}>
				Count: {state}
			</button>
		</>
	);
}

const element = (
	<>
		<div id="foo">
			<a href="https://github.com/Build-Your-Own-LI/mini-react">bar</a>
			<b test="test" />
			<h1 title="test">Hello World!</h1>
			<img
				src={`${import.meta.env.BASE_URL}miniReact.png`}
				alt="test"
				width={100}
				height={100}
			/>
		</div>
		<App name="mini-react" />
	</>
);
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const container = document.getElementById("root")!;
miniReact.render(element, container);
