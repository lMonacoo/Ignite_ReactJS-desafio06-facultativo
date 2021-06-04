import { GetStaticProps } from 'next';
import Head from 'next/head';

import { FiCalendar, FiUser } from 'react-icons/fi';

import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import Prismic from '@prismicio/client';
import { useState } from 'react';
import Link from 'next/link';
import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
}

export default function Home({ postsPagination }: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState<string>(postsPagination.next_page);

  const handleMorePosts = async (): Promise<void> => {
    const data = await fetch(nextPage).then(response => response.json());

    const newPosts = data.results.map(post => {
      return {
        uid: post?.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author,
        },
      };
    });

    setPosts(posts.concat(newPosts));
    setNextPage(data.next_page);
  };

  return (
    <>
      <Head>
        <title>SpaceTraveling | Home</title>
      </Head>

      <main className={commonStyles.container}>
        <header className={styles.homeHeader}>
          <img src="/images/Logo.svg" alt="logo" />
        </header>

        {posts.map(post => (
          <Link key={post.uid} href={`/post/${post.uid}`}>
            <a className={styles.homePost}>
              <strong>{post.data.title}</strong>
              <p>{post.data.subtitle}</p>
              <div>
                <FiCalendar size={20} color="#BBBBBB" />
                <time>
                  {format(parseISO(post.first_publication_date), 'dd MMM Y', {
                    locale: ptBR,
                  })}
                </time>

                <FiUser size={20} color="#BBBBBB" />
                <span>{post.data.author}</span>
              </div>
            </a>
          </Link>
        ))}

        {nextPage && (
          <button
            type="button"
            className={styles.homeLoadMore}
            onClick={handleMorePosts}
          >
            Carregar mais posts
          </button>
        )}
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 1,
    }
  );

  const posts = postsResponse.results.map(post => {
    return {
      uid: post?.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      },
    };
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts,
      },
    },
    revalidate: 60 * 60 * 8, // 8 horas,
  };
};
