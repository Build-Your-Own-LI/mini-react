// TODO: Optimization Type Description
type NodeChild = string | VirtualElement;
type Dispatch<T> = (value: T) => void;
type SetStateAction<StateType> =
	| StateType
	| ((prevState: StateType) => StateType);

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
			h2: {
				title?: string;
			};
			button: {
				type: "button" | "submit" | "reset";
				onClick?: () => void;
			};
			img: {
				width?: number;
				height?: number;
				src: string;
				alt: string;
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

// クラスコンポーネントは扱わない
type ComponentFunction = (props: Record<string, unknown>) => NodeChild; // 関数コンポーネント

const FragmentSymbol = Symbol.for("react.fragment");

// タグ(divなど)またはコンポーネントを表す型
// JSXで書かれた要素は、最終的にこの型に変換される
type VirtualElementType = symbol | string | ComponentFunction;

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
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
interface FiberNode<StateType = any> extends VirtualElement {
	alternate: FiberNode<StateType> | null;
	dom: FiberNodeDOM | null;
	effectTag?: string;
	child: FiberNode | null;
	parent: FiberNode | null;
	sibling: FiberNode | null;
	hooks?: {
		state: StateType;
		queue: StateType[];
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

export function Fragment({
	children,
}: { children: NodeChild[] }): VirtualElement {
	return {
		nodeType: FragmentSymbol,
		props: {
			children: children.map((child) =>
				isVirtualElement(child) ? child : createTextElement(child),
			),
		},
	};
}

const createDom = (nodeType: string, fiber: FiberNode): FiberNodeDOM => {
	const dom =
		nodeType === TEXT_ELEMENT
			? document.createTextNode("")
			: document.createElement(nodeType);

	updateDom(dom, {}, fiber.props);

	return dom;
};

const updateDom = (
	dom: FiberNodeDOM,
	prevProps: VirtualElementProps,
	nextProps: VirtualElementProps,
) => {
	for (const [removePropKey, removePropValue] of Object.entries(prevProps)) {
		if (isVirtualElementProperty(removePropKey)) {
			// @ts-expect-error: Property 'removePropKey' does not exist
			dom[removePropKey] = "";
			continue;
		}
		if (
			isEventHandlerProperty(removePropKey) &&
			isEventListenerOrEventListenerObject(removePropValue)
		) {
			const eventType = removePropKey.toLowerCase().substring(2);
			dom.removeEventListener(eventType, removePropValue);
		}
	}

	for (const [addPropKey, addPropValue] of Object.entries(nextProps)) {
		if (isVirtualElementProperty(addPropKey)) {
			// @ts-expect-error: Property 'addPropKey' does not exist
			dom[addPropKey] = addPropValue;
			continue;
		}
		if (
			isEventHandlerProperty(addPropKey) &&
			isEventListenerOrEventListenerObject(addPropValue)
		) {
			const eventType = addPropKey.toLowerCase().substring(2);
			dom.addEventListener(eventType, addPropValue);
		}
	}
};

let nextUnitOfWork: FiberNode | null = null;
let deletions: FiberNode[] = [];

const reconcileChildren = (fiber: FiberNode, elements: VirtualElement[]) => {
	let prevSibling: FiberNode | null = null;
	let oldFiber: FiberNode | null = fiber.alternate?.child ?? null;

	for (let i = 0; i < elements.length || oldFiber != null; i += 1) {
		const element = elements[i] ?? null;

		let newFiber: FiberNode | null = null;

		const sameType =
			element != null &&
			oldFiber != null &&
			element.nodeType === oldFiber.nodeType;

		// 古いファイバーと新しい要素が同じタイプの場合、DOMノードを保持し、新しいpropsで更新するだけ
		if (sameType && oldFiber != null) {
			newFiber = {
				nodeType: oldFiber.nodeType,
				props: element.props,
				dom: oldFiber.dom,
				child: null,
				sibling: null,
				parent: fiber,
				alternate: oldFiber,
				effectTag: "UPDATE",
			};
		}
		// タイプが異なり、新しい要素がある場合は、新しいDOMノードを作成する必要がある
		if (element != null && !sameType) {
			newFiber = {
				nodeType: element.nodeType,
				props: element.props,
				dom: null, // domはまだ作成されていないのでnull
				child: null,
				sibling: null,
				parent: fiber,
				alternate: null,
				effectTag: "PLACEMENT",
			};
		}
		// タイプが異なり、古いファイバーがある場合は、古いノードを削除する必要がある
		if (oldFiber != null && !sameType) {
			deletions.push(oldFiber);
		}
		if (oldFiber != null) {
			oldFiber = oldFiber.sibling;
		}

		if (i === 0) {
			fiber.child = newFiber;
		} else if (prevSibling != null) {
			prevSibling.sibling = newFiber;
		}

		prevSibling = newFiber;
	}
};

let wipFiber: FiberNode | null = null;
let hookIndex = 0;

// ツリー全体のレンダリングが完了する前にブラウザが中断されうるので、実DOMへの反映は最後にやる
const performUnitOfWork = (fiber: FiberNode) => {
	const { nodeType } = fiber;
	switch (typeof nodeType) {
		// 関数コンポーネントの場合
		case "function": {
			wipFiber = fiber;
			hookIndex = 0;
			wipFiber.hooks = [];
			const child = nodeType(fiber.props);
			const children = isVirtualElement(child)
				? [child]
				: [createTextElement(child)];
			reconcileChildren(fiber, children);
			break;
		}
		// タグの場合
		case "string":
			if (fiber.dom == null) {
				fiber.dom = createDom(nodeType, fiber);
			}
			reconcileChildren(fiber, fiber.props.children ?? []);
			break;
		case "symbol":
			// Fragmentの場合
			if (nodeType === FragmentSymbol) {
				reconcileChildren(fiber, fiber.props.children ?? []);
			}
			break;
		default:
			if (typeof fiber.props !== "undefined") {
				reconcileChildren(fiber, fiber.props.children ?? []);
			}
			break;
	}

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

// フラグメントや関数コンポーネントはDOMノードを持たないので、見つかるまで親を辿る
const findParentFiber = (fiber?: FiberNode): FiberNode | null => {
	if (fiber == null) return null;
	let parentFiber: FiberNode | null = fiber.parent;
	while (parentFiber != null && parentFiber.dom == null) {
		parentFiber = parentFiber.parent;
	}
	return parentFiber;
};

const commitWork = (fiber: FiberNode) => {
	const parentFiber = findParentFiber(fiber);
	const domParent = parentFiber?.dom;
	if (domParent == null) return;

	if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
		domParent.appendChild(fiber.dom);
	}
	if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
		updateDom(fiber.dom, fiber.alternate?.props ?? {}, fiber.props);
	}

	if (fiber.child != null) {
		commitWork(fiber.child);
	}
	if (fiber.sibling != null) {
		commitWork(fiber.sibling);
	}
};

const commitDeletion = (fiber: FiberNode) => {
	const parentFiber = findParentFiber(fiber);
	const domParent = parentFiber?.dom;
	if (domParent != null && fiber.dom != null) {
		domParent.removeChild(fiber.dom);
	}
};

const commitRoot = () => {
	// deletionsはcommitWorkの中でDOMから削除される
	for (const deletion of deletions) {
		commitDeletion(deletion);
	}
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

const useState = <
	StateType extends Exclude<unknown, (...args: unknown[]) => unknown>,
>(
	initialState: StateType,
): [StateType, Dispatch<SetStateAction<StateType>>] => {
	const oldHook = wipFiber?.alternate?.hooks?.[hookIndex];
	const hook: {
		state: StateType;
		queue: SetStateAction<StateType>[];
	} = {
		state: oldHook ? oldHook.state : initialState,
		queue: [],
	};

	const actions = oldHook?.queue ?? [];
	for (const action of actions) {
		if (action instanceof Function) {
			hook.state = action(hook.state);
			continue;
		}
		hook.state = action;
	}

	const setState: Dispatch<SetStateAction<StateType>> = (action) => {
		hook.queue.push(action);
		if (currentRoot == null) return;
		// 作業ループが新しいレンダリングを開始するように
		wipRoot = {
			nodeType: currentRoot.nodeType,
			dom: currentRoot.dom,
			child: null,
			sibling: null,
			parent: null,
			props: currentRoot.props,
			alternate: currentRoot,
		};
		// 次のレンダリングに備える
		deletions = [];
		nextUnitOfWork = wipRoot;
	};

	if (wipFiber?.hooks == null) {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		wipFiber!.hooks = [];
	}
	wipFiber?.hooks.push(hook);
	hookIndex++;

	return [hook.state, setState];
};

export default {
	Fragment,
	createElement,
	render,
	useState,
};
