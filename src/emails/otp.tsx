import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Tailwind,
	Text,
} from "react-email";
import tailwindConfig from "../../tailwind.config";

interface OTPEmailProps {
	loginCode?: string;
	otp?: string;
	url?: string;
}

export const OTPEmail = ({ otp, url }: OTPEmailProps) => (
	<Html>
		<Head />
		<Tailwind config={tailwindConfig}>
			<Body className="bg-white font-notion">
				<Preview>Log in with this magic link</Preview>
				<Container className="px-3 mx-auto">
					<Heading className="text-[#333] text-[24px] my-10 mx-0 p-0">
						Login
					</Heading>
					{url && (
						<Link
							href={url}
							target="_blank"
							className="text-[#2754C5] text-[14px] underline mb-4 block"
						>
							Click here to log in with this magic link
						</Link>
					)}
					{otp && (
						<>
							<Text className="text-[#333] text-[14px] my-6 mb-3.5">
								Or, copy and paste this temporary login code:
							</Text>
							<code className="inline-block py-4 px-[4.5%] w-9/10 bg-[#f4f4f4] rounded-md border border-solid border-[#eee] text-[#333]">
								{otp}
							</code>
						</>
					)}
					<Text className="text-[#ababab] text-[14px] mt-3.5 mb-4">
						If you didn&apos;t try to login, you can safely ignore this email.
					</Text>
					<Text className="text-[#ababab] text-[14px] mt-3.5 mb-9.5">
						Hint: You can set a permanent password in Settings & members → My
						account.
					</Text>
					<Text className="text-[#898989] text-[12px] leading-[22px] mt-3 mb-6">
						<Link
							href="https://notion.so"
							target="_blank"
							className="text-[#898989] text-[14px] underline"
						>
							Notion.so
						</Link>
						, the all-in-one-workspace
						<br />
						for your notes, tasks, wikis, and databases.
					</Text>
				</Container>
			</Body>
		</Tailwind>
	</Html>
);

OTPEmail.PreviewProps = {
	url: "https://notion.so",
	otp: "sparo-ndigo-amurt-secan",
} as OTPEmailProps;

export default OTPEmail;
