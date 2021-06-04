import { parseISO } from 'date-fns';
import format from 'date-fns/format';
import { ptBR } from 'date-fns/locale';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';

import { RichText } from 'prismic-dom';
import { Fragment } from 'react';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { useRouter } from 'next/router';
import Prismic from '@prismicio/client';
import Header from '../../components/Header';

import { getPrismicClient } from '../../services/prismic';

// import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
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

  return (
    <>
      <Head>
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
              {format(parseISO(post.first_publication_date), 'dd MMM Y', {
                locale: ptBR,
              })}
            </time>

            <FiUser size={20} color="#BBBBBB" />
            <span>{post.data.author}</span>

            <FiClock size={20} color="#BBBBBB" />
            <span>{`${timeToRead} min`} </span>
          </a>
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
      </main>
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

export const getStaticProps: GetStaticProps = async ({ params: { slug } }) => {
  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
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
