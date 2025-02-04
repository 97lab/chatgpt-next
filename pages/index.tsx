import classNames from 'classnames';
import { getCookie } from 'cookies-next';
import type { NextPageContext } from 'next';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';

import { Menu } from '@/components/Menu';
import type { MessageProps } from '@/components/Message';
import { Message, SystemMessage } from '@/components/Message';
import { TextareaForm } from '@/components/TextareaForm';
import { fetchChat } from '@/utils/api';
import { isMobile, isWeChat as utilsIsWeChat } from '@/utils/device';
// import { exampleChatMessage, htmlMessage, regexpNumberMessage, userMessage } from '@/utils/exampleChatMessage';
import { scrollToBottom } from '@/utils/scroll';
import { sleep } from '@/utils/sleep';

const WELCOME_MESSAGE = '你好！有什么我可以帮助你的吗？';
const LOADING_MESSAGE = '正在努力思考...';

interface HomeProps {
  apiKey?: string;
  userAgent?: string;
}

export type CompletionParams =
  | {
      model?: 'gpt-3.5-turbo-0301' | 'gpt-3.5-turbo' | 'gpt-4' | 'gpt-4-0314' | 'gpt-4-32k' | 'gpt-4-32k-0314';
    }
  | undefined;

export default function Home({ apiKey, userAgent }: HomeProps) {
  const [logged, setLogged] = useState(!!apiKey);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [completionParams, setCompletionParams] = useState<CompletionParams>(undefined);
  const [windowHeight, setWindowHeight] = useState<string | number>('100vh');

  const isWeChat = utilsIsWeChat(userAgent);

  useEffect(() => {
    // 仅在 mobile 场景下通过计算获取高度
    // https://stackoverflow.com/a/52936500/2777142
    if (!isMobile()) {
      return;
    }
    setWindowHeight(window.innerHeight);
    document.body.style.minHeight = `${window.innerHeight}px`;
    window.addEventListener('resize', () => setWindowHeight(window.innerHeight));
  }, []);

  /** 提交回调 */
  const onSubmit = useCallback(
    async (text: string) => {
      let newMessages: MessageProps[] = [];
      newMessages.push({ align: 'right', chatMessage: { text } });
      setMessages([...messages, ...newMessages]);
      setLoading(true);
      await sleep(16);
      scrollToBottom();
      try {
        const parentMessageId = messages[messages.length - 1]?.chatMessage?.id;
        const chatRes = await fetchChat({ text, parentMessageId, completionParams });
        newMessages.push({ avatar: 'ChatGPT', chatMessage: chatRes });
        setLoading(false);
        setMessages([...messages, ...newMessages]);
        await sleep(16);
        scrollToBottom();
      } catch (e: any) {
        setLoading(false);
        newMessages.push({ avatar: 'ChatGPT', error: e });
        setMessages([...messages, ...newMessages]);
        await sleep(16);
        scrollToBottom();
      }
    },
    [messages, completionParams],
  );

  return (
    <>
      <Head>
        <title>ChatGPT</title>
        <meta name="description" content="A Personal ChatGPT Client" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/chatgpt-green-icon.png" />
        <link rel="apple-touch-icon" type="image/png" href="/chatgpt-green-icon.png" />
      </Head>
      <div className="mx-auto md:w-[1125px] md:min-h-screen md:flex">
        <Menu
          logged={logged}
          setLogged={setLogged}
          completionParams={completionParams}
          setCompletionParams={setCompletionParams}
          windowHeight={windowHeight}
        />
        <main className="w-full md:bg-[#ededed] md:w-[50rem] md:px-4 md:flex md:flex-col">
          <div
            className={classNames('h-14 md:h-16', {
              hidden: isWeChat,
            })}
          />
          <h1
            className={classNames(
              'fixed top-0 w-inherit text-center py-3.5 text-lg bg-gray-wx z-10 border-b-[0.5px] border-gray-300 md:-mx-4 md:pt-[1.375rem]',
              {
                hidden: isWeChat,
              },
            )}
          >
            ChatGPT
          </h1>
          <div className="md:grow" style={{ display: 'flow-root' }}>
            <SystemMessage>
              本页面会将数据发送给 OpenAI
              <br />
              请注意隐私风险，禁止发送违法内容
            </SystemMessage>
            <Message avatar="ChatGPT" chatMessage={{ text: WELCOME_MESSAGE }} />
            {/* <Message align="right" chatMessage={userMessage} />
            <Message avatar="ChatGPT" chatMessage={regexpNumberMessage} />
            <Message align="right" chatMessage={userMessage} />
            <Message avatar="ChatGPT" chatMessage={htmlMessage} /> */}
            {messages.map((messageProps, index) => (
              <Message key={index} {...messageProps} />
            ))}
            {loading && <Message avatar="ChatGPT" chatMessage={{ text: LOADING_MESSAGE }} />}
          </div>
          <TextareaForm logged={logged} onSubmit={onSubmit} />
        </main>
      </div>
    </>
  );
}

// This gets called on every request
export async function getServerSideProps(ctx: NextPageContext) {
  const apiKey = getCookie('apiKey', ctx);
  const userAgent = ctx.req?.headers['user-agent'];

  return {
    props: {
      ...(apiKey ? { apiKey } : {}),
      ...(userAgent ? { userAgent } : {}),
    },
  };
}
