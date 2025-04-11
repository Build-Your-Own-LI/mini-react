import miniReact from "./miniReact";

const element = (
	<div id="foo">
		<a href="https://github.com/Build-Your-Own-LI/mini-react">bar</a>
		<b test="test" />
		<h1 title="test">Hello World!</h1>
	</div>
);
// biome-ignore lint/style/noNonNullAssertion: <explanation>
const container = document.getElementById("root")!;
miniReact.render(element, container);
