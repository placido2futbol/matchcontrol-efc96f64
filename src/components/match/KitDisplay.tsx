interface KitDisplayProps {
  kitHtml?: string;
  kitUrl?: string;
  alt?: string;
  className?: string;
}

export default function KitDisplay({ kitHtml, kitUrl, alt = '', className = 'w-16 h-20' }: KitDisplayProps) {
  if (kitHtml) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: kitHtml }}
      />
    );
  }

  if (kitUrl) {
    return (
      <img
        src={kitUrl}
        alt={alt}
        className={`${className} object-contain`}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return null;
}
