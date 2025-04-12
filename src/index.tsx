import miniReact from "./miniReact";

function App(props: { name: string }) {
	const [state, setState] = miniReact.useState(0);
	const handleClick = () => {
		setState(state + 1);
	};
	return (
		<>
			{/*  差分解析(PLACEMENT,DELETION)を確認  */}
			{state === 2 ? <div>count is 2</div> : null}
			<button type="button" onClick={handleClick}>
				Hi, {props.name}! Count: {state}
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
			<App name="mini-react" />
		</div>
		<div>test</div>
	</>
);
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const container = document.getElementById("root")!;
miniReact.render(element, container);
