import { HTMLProps, ReactNode, useRef, useState } from "react";

export function App({ children }: { children?: ReactNode } = {}) {
    const [isH1, setIsH1] = useState(true);
    const ref = useRef<HTMLHeadingElement>(null!);

    const toggleHeading = () => {
        setIsH1((prev) => !prev);
    };

    return (
        <div className="p-4 text-center">
            {isH1 ? <h1 ref={ref}>This is an H1</h1> : <h2 ref={ref}>This is an H2</h2>}
            <button
                type="button"
                onClick={toggleHeading}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
                Toggle Heading
            </button>
            {children}
        </div>
    );
}

function Test({ ref }: HTMLProps<HTMLElement>) {
    useRef;
}

// import { createContext, ReactNode, use, useContext, useEffect, useRef, useState } from "react";

// const TestContext = createContext<string | null>(null);

// const ObjContext = createContext<{ x: number } | undefined>(undefined);

// export function App() {
//     const ref = useRef<HTMLParagraphElement>(null);
//     const [value, setValue] = useState<string | null>(null);
//     const [comp, setComp] = useState<boolean>(true);
//     useEffect(() => {
//         setValue(ref.current?.textContent + "2");
//     }, []);
//     return (
//         <>
//             {/* <Test /> */}
//             <button
//                 type="button"
//                 onClick={() => {
//                     console.log("BUTTONCLICK");
//                     setComp(!comp);
//                 }}
//             />
//             <TestContext value={value}>
//                 <p ref={ref}>HALLO</p>
//                 <Test4>{comp ? <Test3 key={0} /> : <Test3 key={1} />}</Test4>
//             </TestContext>
//         </>
//     );
// }

// export function App() {
//     const ref = useRef<HTMLParagraphElement>(null);
//     const [value, setValue] = useState<string | null>(null);
//     const [comp, setComp] = useState<boolean>(true);
//     useEffect(() => {
//         setValue(ref.current?.textContent + "2");
//     }, []);
//     return (
//         <>
//             {/* <Test /> */}
//             <button
//                 type="button"
//                 onClick={() => {
//                     console.log("BUTTONCLICK");
//                     setComp(!comp);
//                 }}
//             />
//             <TestContext value={value}>
//                 <p ref={ref}>HALLO</p>
//                 <Test4>{comp ? <Test3 key={0} /> : <Test3 key={1} />}</Test4>
//             </TestContext>
//         </>
//     );
// }

export function Test() {
    const text = use(TestContext);
    console.log(`Test ${text}`);
    return <p>{text + "2"}</p>;
}

export function Test2() {
    console.log(`Test2`);
    return <Test></Test>;
}

export function Test3() {
    const text = use(TestContext);
    console.log(`Test3 ${text}`);
    return <Test2></Test2>;
}

export function Test4({ children }: { children?: ReactNode }) {
    console.log(`Test4`);
    return <>{children}</>;
}
