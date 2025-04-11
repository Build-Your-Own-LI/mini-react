import miniReact from "./miniReact";

const element = miniReact.createElement(
	"div",
	{ id: "foo" },
	miniReact.createElement("a", { href: "https://example.com" }, "bar"),
	miniReact.createElement("b", null, "baz"),
);

console.log(element);
