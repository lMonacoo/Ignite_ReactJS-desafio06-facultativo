import { parseISO } from 'date-fns';
import format from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';

import { RichText } from 'prismic-dom';
import { Fragment, useEffect, useRef } from 'react';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import Link from 'next/link';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

// import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import ExitPreviewButton from '../../components/exitPreviewButton';

import useUpdatePreviewRef from '../../hooks/useUpdatePreviewRef';

interface Post {
  preview: boolean;
  previewRef: {
    activeRef: string | null;
  };
  id: string;
  uid: string;
  prev_post: {
    prev_uid: string;
    prev_title: string;
  };
  next_post: {
    next_uid: string;
    next_title: string;
  };
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();
  const commentRef = useRef<HTMLDivElement>(null);

  useUpdatePreviewRef(post.previewRef, post.preview, post.id);

  useEffect((): (() => void) => {
    const constroyComments = async (): Promise<void> => {
      const scriptEl = await document.createElement('script');
      scriptEl.setAttribute('src', 'https://utteranc.es/client.js');
      scriptEl.setAttribute('crossorigin', 'anonymous');
      scriptEl.setAttribute('async', 'true');
      scriptEl.setAttribute('repo', 'lMonacoo/utterances_comments');
      scriptEl.setAttribute('issue-term', 'title');
      scriptEl.setAttribute('theme', 'photon-dark');

      await commentRef.current?.appendChild(scriptEl);
    };

    constroyComments();

    return () =>
      commentRef.current?.removeChild(commentRef.current.children[0]);
  }, [router]);

  if (router.isFallback) {
    return <h1 className={styles.loadMessage}>Carregando...</h1>;
  }

  const postWordsCount = post.data.content.reduce((acc, index) => {
    const contentCount = index.body.reduce((contentAcc, contentIndex) => {
      return contentAcc + contentIndex.text.match(/(\w+)/g)?.length;
    }, 0);

    return acc + index.heading?.match(/(\w+)/g).length + contentCount;
  }, 0);

  const timeToRead = Math.ceil(postWordsCount / 200);

  const editedDate = format(
    new Date(post.last_publication_date),
    `d MMM Y, 'às' H:mm`,
    {
      locale: ptBR,
    }
  );

  return (
    <>
      <Head>
        {post.preview && (
          <script
            async
            defer
            src="https://static.cdn.prismic.io/prismic.js?new=true&repo=03-ignite"
          />
        )}
        <title>{`${post.data.title} | Posts`}</title>
      </Head>

      <Header />

      <main className={styles.postContainer}>
        <figure>
          {post.data.banner.url && (
            <img src={post.data.banner.url} alt={`banner ${post.data.title}`} />
          )}
        </figure>
        <article className={styles.postContent}>
          <h1>{post.data.title}</h1>
          <a>
            <FiCalendar size={20} color="#BBBBBB" />
            <time>
              {post.first_publication_date
                ? format(parseISO(post.first_publication_date), 'dd MMM Y', {
                    locale: ptBR,
                  })
                : 'pendente'}
            </time>

            <FiUser size={20} color="#BBBBBB" />
            <span>{post.data.author}</span>

            <FiClock size={20} color="#BBBBBB" />
            <span>{`${timeToRead} min`} </span>
          </a>
          {post.last_publication_date && <p>{`* editado em ${editedDate}`}</p>}
          {post.data.content.map(item => {
            return (
              <Fragment key={item.heading}>
                <strong>{item.heading}</strong>
                <div
                  className={styles.postBody}
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(item.body),
                  }}
                />
              </Fragment>
            );
          })}
        </article>
        <section className={styles.navigationLinks}>
          {post.prev_post.prev_uid && (
            <Link href={`/post/${post.prev_post.prev_uid}`}>
              <a>
                <p>{post.prev_post.prev_title}</p>
                <strong>Post anterior</strong>
              </a>
            </Link>
          )}

          {post.next_post.next_uid && (
            <Link href={`/post/${post.next_post.next_uid}`}>
              <a>
                <p>{post.next_post.next_title}</p>
                <strong>Próximo post</strong>
              </a>
            </Link>
          )}
        </section>

        <div ref={commentRef} className={styles.commentBox} />
      </main>

      {post.preview && <ExitPreviewButton />}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 2,
    }
  );

  const staticPages = posts.results.map(post => ({
    params: { slug: String(post.uid) },
  }));

  return {
    paths: staticPages,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params: { slug },
  preview = false,
  previewData,
}) => {
  const prismic = getPrismicClient();

  const previewRef = { activeRef: previewData?.ref ?? null };

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewRef.activeRef,
  });

  const nextPost = (
    await prismic.query([Prismic.Predicates.at('document.type', 'posts')], {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]',
    })
  ).results[0];

  const prevPost = (
    await prismic.query([Prismic.Predicates.at('document.type', 'posts')], {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date desc]',
    })
  ).results[0];

  const post = {
    preview,
    previewRef,
    id: response.id,
    uid: response.uid,
    prev_post: {
      prev_uid: prevPost?.uid || null,
      prev_title: prevPost?.data.title || null,
    },
    next_post: {
      next_uid: nextPost?.uid || null,
      next_title: nextPost?.data.title || null,
    },
    first_publication_date: response?.first_publication_date,
    last_publication_date: response?.last_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url:
          response.data.banner?.url ||
          'https://source.unsplash.com/random/1200x300?Technology',
      },
      author: response.data.author,
      content: response.data.content,
    },
  };

  return {
    props: { post },
    revalidate: 60 * 60 * 8, // horas
  };
};
