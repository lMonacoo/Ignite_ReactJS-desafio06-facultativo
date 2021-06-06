import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

const prismicRepoName = /([a-zA-Z0-9-]+)?(\.cdn)?\.prismic\.io/.exec(
  'https://03-ignite.cdn.prismic.io/api/v2'
)[1];

interface previewProps {
  activeRef: string | null;
}

export default function useUpdatePreviewRef(
  preview: previewProps,
  isPreview: boolean,
  documentId: string
): void {
  const router = useRouter();
  useEffect((): any => {
    if (isPreview) {
      const rawPreviewCookie = Cookies.get('io.prismic.preview');
      if (rawPreviewCookie) {
        const previewCookie = JSON.parse(rawPreviewCookie);
        const previewCookieObject =
          previewCookie[`${prismicRepoName}.prismic.io`];
        const previewCookieRef =
          previewCookieObject && previewCookieObject.preview
            ? previewCookieObject.preview
            : null;

        if (previewCookieRef && preview.activeRef !== previewCookieRef) {
          return router.push(
            `/api/preview?token=${previewCookieRef}&documentId=${documentId}`
          );
        }
      } else {
        return router.push('/api/exit-preview');
      }
    }
    return undefined;
  }, [documentId, isPreview, preview.activeRef, router]);
}
