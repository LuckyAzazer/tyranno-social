interface TyrannoCoinProps {
  className?: string;
}

export function TyrannoCoin({ className = "h-8 w-8" }: TyrannoCoinProps) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}/logo.svg`}
      alt="Tyrannosocial Logo"
      className={className}
    />
  );
}
