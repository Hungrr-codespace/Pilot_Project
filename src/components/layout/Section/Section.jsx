// A page section. On mobile, sections marked with data-morph fade and grow into view while scrolling
// (see useScrollMorph).
export function Section({ as: Tag = 'section', id, className, children }) {
  return (
    <Tag id={id} className={className} data-morph="">
      {children}
    </Tag>
  );
}
