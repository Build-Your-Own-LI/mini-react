// TODO: Optimization Type Description

abstract class Component {
	props: Record<string, unknown>;
	abstract state: unknown;
	abstract setState: (newState: unknown) => void;
	abstract render: () => VirtualElement;

	constructor(props: Record<string, unknown>) {
		this.props = props;
	}

	// クラスコンポーネントかどうか
	static REACT_COMPONENT = true;
}

interface ComponentFunction {
	new (props: Record<string, unknown>): Component; // クラスコンポーネント
	(props: Record<string, unknown>): VirtualElement | string; // 関数コンポーネント
}

// タグ(divなど)またはコンポーネントを表す型
// JSXで書かれた要素は、最終的にこの型に変換される
type VirtualElementType = string | ComponentFunction;

interface VirtualElementProps {
	children?: VirtualElement[];
	[propName: string]: unknown;
}
type VirtualElement = {
	nodeType: VirtualElementType;
	props: VirtualElementProps;
};

const isVirtualElement = (element: unknown): element is VirtualElement =>
	typeof element === "object" &&
	element !== null &&
	"nodeType" in element &&
	"props" in element;

const createTextElement = (text: string): VirtualElement => ({
	nodeType: "TEXT_ELEMENT",
	props: { nodeValue: text },
});

const createElement = (
	nodeType: VirtualElementType,
	props: VirtualElementProps | null,
	...children: (string | VirtualElement)[]
): VirtualElement => ({
	nodeType,
	props: {
		...props,
		children: children.map((child) =>
			isVirtualElement(child) ? child : createTextElement(child),
		),
	},
});

export default {
	createElement,
};
