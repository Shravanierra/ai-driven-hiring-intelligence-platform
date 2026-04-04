import React from 'react';

interface Props {
  src: string;
}

export default function PageBackground({ src }: Props) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}
