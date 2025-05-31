import { createContext, ReactNode, use, useContext, useEffect, useRef, useState } from "react";

const TestContext = createContext<string | null>(null);

const ObjContext = createContext<{ x: number } | undefined>(undefined);

export function App() {
    const ref = useRef<HTMLParagraphElement>(null);
    const [value, setValue] = useState<string | null>(null);
    const [comp, setComp] = useState<boolean>(true);
    useEffect(() => {
        setValue(ref.current?.textContent + "2");
    }, []);
    return (
        <>
            {/* <Test /> */}
            <button
                type="button"
                onClick={() => {
                    console.log("BUTTONCLICK");
                    setComp(!comp);
                }}
            />
            <TestContext value={value}>
                <p ref={ref}>HALLO</p>
                <Test4>{comp ? <Test3 key={0} /> : <Test3 key={1} />}</Test4>
            </TestContext>
        </>
    );
}

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
