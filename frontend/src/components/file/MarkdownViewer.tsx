import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// import "../../../public/Mira_logo.png";
import "../../../public/Mira_logo.png";
import "../file/MarkdownViewer.css";

interface MarkdownViewerProps {
	content: string;
}

const MarkdownViewer = ({ content }: MarkdownViewerProps) => {
	return (
		<>
			{/* <div className="pdf-export"> */}
			<div id="markdown-container">
				<ReactMarkdown
					remarkPlugins={[remarkGfm]}
					components={{
						h1: ({ node, ...props }) => (
							<div
								style={{
									display: "flex",

									height: "100px", // Adjust the height as needed
								}}
							>
								<h1
									className="text-3xl font-bold mb-4 "
									{...props}
								/>
							</div>
						),
						h2: ({ node, ...props }) => (
							<div
								style={{
									display: "flex",

									height: "60px", // Adjust the height as needed
								}}
							>
								<h2
									className="text-2xl font-semibold mb-3 mt-6"
									{...props}
								/>
							</div>
						),
						h3: ({ node, ...props }) => (
							<div
								style={{
									display: "flex",

									height: "60px", // Adjust the height as needed
								}}
							>
								<h3
									className="text-xl font-semibold mb-2 mt-4"
									{...props}
								/>
							</div>
						),
						h4: ({ node, ...props }) => (
							<h4
								className="text-lg font-semibold mb-2 mt-3"
								{...props}
							/>
						),
						h5: ({ node, ...props }) => (
							<h5
								className="text-base font-medium mb-1 mt-2"
								{...props}
							/>
						),
						h6: ({ node, ...props }) => (
							<h6
								className="text-sm font-medium mb-1 mt-2 text-gray-600 dark:text-gray-400"
								{...props}
							/>
						),
						p: ({ node, ...props }) => (
							<p
								className="mb-4 text-gray-700 dark:text-gray-300"
								{...props}
							/>
						),
						ul: ({ node, ...props }) => (
							<ul
								className="list-disc pl-5 relative"
								{...props}
							/>
						),
						ol: ({ node, ...props }) => (
							<ol
								className="list-decimal pl-8 mb-4 space-y-1"
								{...props}
							/>
						),
						li: ({ node, ...props }) => (
							<li
								className=" mb-1 pl-5 relative text-gray-700 dark:text-gray-300"
								{...props}
							/>
						),
						hr: ({ node, ...props }) => (
							<hr
								className="my-6 border-gray-200 dark:border-gray-700"
								{...props}
							/>
						),
						code: ({ node, className, children, ...props }) => {
							return (
								<code
									className="w-full md:w-[90%] px-1 py-0.5 rounded-md bg-secondary text-sm "
									{...props}
								>
									{children}
								</code>
							);
						},
						strong: ({ node, ...props }) => (
							<strong className="font-semibold" {...props} />
						),
						em: ({ node, ...props }) => (
							<em className="italic" {...props} />
						),
						blockquote: ({ node, ...props }) => (
							<blockquote
								className="border-l-4  pl-4 italic my-4"
								{...props}
							/>
						),
						a: ({ href, children, ...props }) => (
							<a
								href={href}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-500 hover:underline"
								{...props}
							>
								{children}
							</a>
						),

						table: ({ children }) => (
							<table className="table-auto border-collapse border border-gray-300 w-full">
								{children}
							</table>
						),
						thead: ({ children }) => (
							<thead className="bg-gray-200">{children}</thead>
						),
						tbody: ({ children }) => (
							<tbody className="divide-y divide-gray-200">
								{children}
							</tbody>
						),
						tr: ({ children }) => (
							<tr className="border-b border-gray-300">
								{children}
							</tr>
						),
						th: ({ children }) => (
							<th className="px-4 py-2 text-left font-semibold text-gray-700">
								{children}
							</th>
						),
						td: ({ children }) => (
							<td className="px-4 py-2 text-gray-600">
								{children}
							</td>
						),
						del: ({ node, ...props }) => (
							<del className="line-through" {...props} />
						),
						pre: ({ children, ...props }) => (
							<pre
								className="p-4 overflow-auto rounded-md bg-secondary"
								{...props}
							>
								{children}
							</pre>
						),
						br: () => <br />,
					}}
				>
					{content}
				</ReactMarkdown>
			</div>
		</>
	);
};

export default MarkdownViewer;
