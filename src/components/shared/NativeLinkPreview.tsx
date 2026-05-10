import { useState, useEffect } from 'react';

// Link preview cache to avoid repeated API calls
export const linkPreviewCache = new Map<string, { title: string; description?: string; image?: string } | null>();

// Native Link Preview Component with caching
export const NativeLinkPreview = ({ url, compact = false }: { url: string; compact?: boolean }) => {
  const [data, setData] = useState<{ title: string; description?: string; image?: string } | null>(
    linkPreviewCache.get(url) ?? null
  );
  const [loading, setLoading] = useState(!linkPreviewCache.has(url));
  
  useEffect(() => {
    // Already cached (hit or miss)
    if (linkPreviewCache.has(url)) {
      setData(linkPreviewCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => {
        if (d.status === 'success' && d.data?.title) {
          const preview = { title: d.data.title, description: d.data.description, image: d.data.image?.url };
          linkPreviewCache.set(url, preview);
          setData(preview);
        } else {
          linkPreviewCache.set(url, null); // Cache the miss too
        }
      })
      .catch(() => { linkPreviewCache.set(url, null); })
      .finally(() => setLoading(false));
  }, [url]);

  if (loading || !data) return null;
  
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`native-link-preview ${compact ? 'compact' : ''}`}>
      {data.image && <img src={data.image} alt="preview" className="preview-img" />}
      <div className="preview-text">
        <h4>{data.title}</h4>
        <p>{data.description?.substring(0, 80)}...</p>
      </div>
    </a>
  );
};
