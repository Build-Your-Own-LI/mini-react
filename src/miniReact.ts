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
// イベントハンドラはプロパティが変更された場合、元のハンドラを削除する必要があるため、特別扱い
const isEventHandlerProperty = (key: string) => key.startsWith("on");
const isEventListenerOrEventListenerObject = (
	value: unknown,
): value is EventListenerOrEventListenerObject =>
	typeof value === "function" ||
	(typeof value === "object" &&
		value !== null &&
		"handleEvent" in value &&
		value.handleEvent instanceof Function);
const isVirtualElementProperty = (key: string) =>
	key !== "children" && !isEventHandlerProperty(key);

type VirtualElement = {
	nodeType: VirtualElementType;
	props: VirtualElementProps;
};

type FiberNodeDOM = Element | Text;
interface FiberNode<S = unknown> extends VirtualElement {
	alternate: FiberNode<S> | null;
	dom: FiberNodeDOM | null;
	effectTag?: string;
	child: FiberNode | null;
	parent: FiberNode | null;
	sibling: FiberNode | null;
	hooks?: {
		state: S;
		queue: S[];
	}[];
}

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

const createDom = (fiber: FiberNode): FiberNodeDOM => {
	const nodeType = fiber.nodeType;
	// propsはpropertiesからループで入れるというフローを統一化するために、TextNodeも空文字で初期化する
	// TODO: フラグメントやカスタムコンポーネントはサポートしていない
	const dom =
		nodeType === TEXT_ELEMENT
			? document.createTextNode("")
			: document.createElement(nodeType as string);

	const properties = Object.keys(fiber.props).filter(isVirtualElementProperty);

	for (const property of properties) {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(dom as any)[property] = fiber.props[property];
	}

	return dom;
};

const updateDom = (
	dom: FiberNodeDOM,
	prevProps: VirtualElementProps,
	nextProps: VirtualElementProps,
) => {
	const isNew =
		(prev: VirtualElementProps, next: VirtualElementProps) => (key: string) =>
			prev[key] !== next[key];
	const isGone = (next: VirtualElementProps) => (key: string) => !(key in next);

	// Remove old properties
	const keysToRemove = Object.keys(prevProps)
		.filter(isVirtualElementProperty)
		.filter(isGone(nextProps));

	for (const key of keysToRemove) {
		// undefinedやnullをDOMに設定すると、stringのプロパティではstringでキャストされて、無効な値になることがある
		// そのため、空文字を設定する
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(dom as any)[key] = "";
	}

	const keysToUpdate = Object.keys(nextProps)
		.filter(isVirtualElementProperty)
		.filter(isNew(prevProps, nextProps));

	for (const key of keysToUpdate) {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		(dom as any)[key] = nextProps[key];
	}

	// Remove old or changed event handlers
	const eventHandlers = Object.keys(prevProps)
		.filter(isEventHandlerProperty)
		.filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key));
	for (const key of eventHandlers) {
		const eventName = key.toLowerCase().substring(2);
		const eventListener = prevProps[key];
		if (isEventListenerOrEventListenerObject(eventListener)) {
			dom.removeEventListener(eventName, eventListener);
		}
	}
	// Add new event handlers
	const newEventHandlers = Object.keys(nextProps)
		.filter(isEventHandlerProperty)
		.filter(isNew(prevProps, nextProps));

	for (const key of newEventHandlers) {
		const eventName = key.toLowerCase().substring(2);
		const eventListener = nextProps[key];
		if (isEventListenerOrEventListenerObject(eventListener)) {
			dom.addEventListener(eventName, eventListener);
		}
	}
};

let nextUnitOfWork: FiberNode | null = null;
let deletions: FiberNode[] = [];

const reconcileChildren = (wipFiber: FiberNode, elements: VirtualElement[]) => {
	let prevSibling: FiberNode | null = null;
	const oldFiber: FiberNode | null = wipFiber.alternate?.child ?? null;

	for (let i = 0; i < elements.length || oldFiber != null; i += 1) {
		const element = elements[i] ?? null;

		let newFiber: FiberNode | null = null;

		const sameType =
			element != null &&
			oldFiber != null &&
			element.nodeType === oldFiber.nodeType;

		// 古いファイバーと新しい要素が同じタイプの場合、DOMノードを保持し、新しいpropsで更新するだけ
		if (sameType) {
			newFiber = {
				nodeType: oldFiber.nodeType,
				props: element.props,
				dom: oldFiber.dom,
				child: null,
				sibling: null,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
			};
		}
		// タイプが異なり、新しい要素がある場合は、新しいDOMノードを作成する必要がある
		if (element != null && !sameType) {
			newFiber = {
				nodeType: element.nodeType,
				props: element.props,
				dom: null,
				child: null,
				sibling: null,
				parent: wipFiber,
				alternate: null,
				effectTag: "PLACEMENT",
			};
		}
		// タイプが異なり、古いファイバーがある場合は、古いノードを削除する必要がある
		if (oldFiber != null && !sameType) {
			oldFiber.effectTag = "DELETION";
			deletions.push(oldFiber);
		}

		if (i === 0) {
			wipFiber.child = newFiber;
		} else {
			// index0の時にnewFiberをprevSiblingに入れているので、nullではない
			// biome-ignore lint/style/noNonNullAssertion: <explanation>
			prevSibling!.sibling = newFiber;
		}

		prevSibling = newFiber;
	}
};

// ツリー全体のレンダリングが完了する前にブラウザが中断されうるので、実DOMへの反映は最後にやる
const performUnitOfWork = (fiber: FiberNode) => {
	if (fiber.dom == null) {
		fiber.dom = createDom(fiber);
	}

	// fiberのchildrenのFiberNodeを構成する
	const elements = fiber.props.children ?? [];
	reconcileChildren(fiber, elements);

	if (fiber.child != null) {
		return fiber.child;
	}
	let nextFiber: FiberNode | null | undefined = fiber;
	while (nextFiber != null) {
		if (nextFiber.sibling != null) {
			return nextFiber.sibling;
		}
		nextFiber = nextFiber.parent;
	}
	return null;
};

let wipRoot: FiberNode | null = null;
let currentRoot: FiberNode | null = null;

const commitWork = (fiber: FiberNode) => {
	const domParent = fiber.parent?.dom;
	if (domParent == null || fiber.dom == null) return;
	if (fiber.effectTag === "PLACEMENT") {
		domParent.appendChild(fiber.dom);
	}
	if (fiber.effectTag === "UPDATE") {
		// domがupdateしているのだから、fiber.alternateは必ず存在する
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		updateDom(domParent, fiber.alternate!.props, fiber.props);
	}
	if (fiber.effectTag === "DELETION") {
		domParent.removeChild(fiber.dom);
	}

	if (fiber.child != null) {
		commitWork(fiber.child);
	}
	if (fiber.sibling != null) {
		commitWork(fiber.sibling);
	}
};

const commitRoot = () => {
	if (wipRoot == null || wipRoot.child == null) return;
	commitWork(wipRoot.child);
	currentRoot = wipRoot;
	wipRoot = null;
	nextUnitOfWork = null;
};

/**
 * `workLoop` 関数は、`requestIdleCallback` API を使用してアイドル時間中に実行されるコールバックです。
 * この関数は、メインスレッドの応答性を維持しながら、非同期的に作業単位を処理します。
 *
 * @param deadline - ブラウザから提供されるオブジェクトで、現在のアイドル期間中の残り時間に関する情報を含みます。
 * `timeRemaining` メソッドを使用して、アイドル期間中の残り時間（ミリ秒単位）を取得できます。
 *
 * この関数の動作は以下の通りです:
 * - 作業単位 (`nextUnitOfWork`) を以下のいずれかの条件を満たすまで連続的に処理します:
 *   - 処理すべき作業単位がなくなる。
 *   - 残りのアイドル時間 (`deadline.timeRemaining()`) が 1 ミリ秒未満になる。
 * - 処理すべき作業単位がまだ残っている場合、次のアイドル期間に再度実行されるように
 *   `requestIdleCallback` を使用して自身をスケジュールします。
 */
const workLoop: IdleRequestCallback = (deadline) => {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}

	if (nextUnitOfWork == null && wipRoot != null) {
		commitRoot();
	}
	requestIdleCallback(workLoop);
};

requestIdleCallback(workLoop);

const render = (element: VirtualElement, container: Element | Text) => {
	wipRoot = {
		nodeType: "div",
		dom: container,
		child: null,
		sibling: null,
		parent: null,
		props: {
			children: [element],
		},
		alternate: currentRoot,
	};
	deletions = [];
	nextUnitOfWork = wipRoot;
};

export function Fragment({ children }: { children: NodeChild[] }) {
	return children;
}

export default {
	Fragment,
	createElement,
	render,
};
