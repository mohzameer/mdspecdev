
import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
} from '@react-email/components';
import React from 'react';

interface NewCommentEmailProps {
    authorName: string;
    specName: string;
    commentBody: string;
    actionUrl: string;
}

export default function NewCommentEmail({
    authorName = 'Alex Smith',
    specName = 'Authentication Spec',
    commentBody = 'I think we should reconsider this approach.',
    actionUrl = 'https://mdspec.dev',
}: NewCommentEmailProps) {
    const previewText = `New comment on ${specName}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] w-[465px]">
                        <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                            New Comment on <span className="font-bold">{specName}</span>
                        </Heading>
                        <Text className="text-black text-[14px] leading-[24px]">
                            Hello,
                        </Text>
                        <Text className="text-black text-[14px] leading-[24px]">
                            <strong>{authorName}</strong> commented on a thread you are participating in:
                        </Text>
                        <Section className="bg-slate-50 p-4 rounded-md my-4 border border-slate-200">
                            <Text className="text-slate-600 text-[14px] m-0 italic">
                                "{commentBody}"
                            </Text>
                        </Section>
                        <Section className="text-center mt-[32px] mb-[32px]">
                            <Button
                                className="bg-[#000000] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                                href={actionUrl}
                            >
                                View Discussion
                            </Button>
                        </Section>
                        <Hr className="border border-solid border-[#eaeaea] my-[26px] mx-0 w-full" />
                        <Text className="text-[#666666] text-[12px] leading-[24px]">
                            You received this email because you are participating in this thread.
                        </Text>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}
