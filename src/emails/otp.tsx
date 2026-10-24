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
	otp?: string;
	url?: string;
}

export const OTPEmail = ({ otp, url }: OTPEmailProps) => (
	<Html>
		<Head />
		<Tailwind config={tailwindConfig}>
			<Body className="bg-white font-notion">
				<Preview>Your account security code</Preview>
				<Container className="px-3 mx-auto">
					<Heading className="text-[#333] text-[24px] my-10 mx-0 p-0">
						Account verification
					</Heading>
					{url && (
						<Link
							href={url}
							target="_blank"
							className="text-[#2754C5] text-[14px] underline mb-4 block"
						>
							Continue securely
						</Link>
					)}
					{otp && (
						<>
							<Text className="text-[#333] text-[14px] my-6 mb-3.5">
								Use this one-time code to continue:
							</Text>
							<code className="inline-block py-4 px-[4.5%] w-9/10 bg-[#f4f4f4] rounded-md border border-solid border-[#eee] text-[#333]">
								{otp}
							</code>
							<Text className="text-[#898989] text-[12px] mt-3 mb-6">
								This code expires shortly and can only be used once.
							</Text>
						</>
					)}
					<Text className="text-[#ababab] text-[14px] mt-3.5 mb-4">
						If you didn&apos;t request this code, you can safely ignore this
						email.
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
