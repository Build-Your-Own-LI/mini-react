import miniReact from "./miniReact";

function App(props: { name: string }) {
	return <h2>Hi, {props.name}!</h2>;
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
