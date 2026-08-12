interface LogoProps {
  className?: string;
}

export default function Logo({ className }: LogoProps) {
  return <img src="/logo-tecvancel.png" alt="TecVancel" className={className} />;
}
