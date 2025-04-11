// TODO: Optimization Type Description
type NodeChild = string | VirtualElement;

/**
 * tsxで書かれた場合、ここで定義されたプロパティで型チェックが行われる
 * reactの場合:https://github.com/DefinitelyTyped/DefinitelyTyped/blob/d2addc5832237b6013393bc968e16dbdd0aee982/types/react/index.d.ts#L4026
 */
declare global {
	namespace JSX {
		interface IntrinsicElements {
			div: {
				id?: string;
			};
			h1: {
				title?: string;
			};
			a: {
				href: string;
			};
			b: {
				test: string;
			};
		}
	}
}

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
	(props: Record<string, unknown>): NodeChild; // 関数コンポーネント
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

const TEXT_ELEMENT = "TEXT_ELEMENT";
const createTextElement = (text: string): VirtualElement => ({
	nodeType: TEXT_ELEMENT,
	props: { nodeValue: text },
});

const createElement = (
	nodeType: VirtualElementType,
	props: VirtualElementProps | null,
	...children: NodeChild[]
): VirtualElement => ({
	nodeType,
	props: {
		...props,
		children: children.map((child) =>
			isVirtualElement(child) ? child : createTextElement(child),
		),
	},
});

const render = (element: VirtualElement, container: Element | Text) => {
	const nodeType = element.nodeType;
	// propsはpropertiesからループで入れるというフローを統一化するために、TextNodeも空文字で初期化する
	const dom =
		nodeType === TEXT_ELEMENT
			? document.createTextNode("")
			: document.createElement(nodeType as string);

	const isProperty = (key: string) => key !== "children";
	const properties = Object.keys(element.props).filter(isProperty);

	for (const property of properties) {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(dom as any)[property] = element.props[property];
	}

	const children = element.props.children || [];
	for (const child of children) {
		render(child, dom);
	}

	container.appendChild(dom);
};

export function Fragment({ children }: { children: NodeChild[] }) {
	return children;
}

export default {
	Fragment,
	createElement,
	render,
};
