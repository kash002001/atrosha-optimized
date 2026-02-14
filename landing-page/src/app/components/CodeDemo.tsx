"use client";

export default function CodeDemo() {
    return (
        <section className="py-24 bg-background-light dark:bg-background-dark">
            <div className="max-w-5xl mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl md:text-4xl text-text-light dark:text-white mb-4">
                        Integrate in 120 seconds
                    </h2>
                    <p className="text-muted-light dark:text-muted-dark">
                        Drop into your existing infrastructure with a single binary.
                    </p>
                </div>
                <div className="rounded-xl overflow-hidden shadow-2xl bg-[#1E1E1E] border border-gray-800 font-mono text-sm leading-relaxed">
                    <div className="bg-[#2D2D2D] px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                        <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1 text-center text-gray-500 text-xs">
                            bash — 80x24
                        </div>
                    </div>
                    <div className="p-6 text-gray-300">
                        <div className="mb-4">
                            <span className="text-accent-green">$</span> curl -sL
                            https://atrosha.sh/install | bash
                        </div>
                        <div className="text-gray-500 mb-6">
                            &gt; Downloading Atrosha v2.4.0...
                            <br />
                            &gt; Verifying signatures...
                            <br />
                            &gt; Installed to /usr/local/bin/atrosha
                        </div>
                        <div className="mb-2">
                            <span className="text-accent-green">$</span> atrosha init
                            --mode=strict
                        </div>
                        <div className="mt-6 bg-[#252526] p-4 rounded border border-gray-700/50">
                            <span className="text-purple-400">fn</span>{" "}
                            <span className="text-blue-400">main</span>() {"{"}
                            <br />
                            &nbsp;&nbsp;
                            <span className="text-purple-400">let</span> proxy ={" "}
                            <span className="text-yellow-300">Atrosha</span>::
                            <span className="text-blue-300">new</span>();
                            <br />
                            &nbsp;&nbsp;proxy.
                            <span className="text-blue-300">set_policy</span>
                            (Policy::FinancialSafe);
                            <br />
                            &nbsp;&nbsp;proxy.
                            <span className="text-blue-300">listen</span>(
                            <span className="text-green-400">":8080"</span>);
                            <br />
                            {"}"}
                        </div>
                        <div className="mt-4 animate-pulse">
                            <span className="text-accent-green">$</span>{" "}
                            <span className="w-2 h-4 inline-block bg-gray-400 align-middle ml-1"></span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
