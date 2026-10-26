/**
 * 아이콘 6종 — assets/project/icons/*.svg와 같은 path를 쓰는 React 컴포넌트.
 * React 계열 프로젝트에서만 이 파일을 쓴다(vanilla 계열은 svg 파일을 직접
 * 참조). 색은 stroke="currentColor"로 부모 요소의 color를 상속한다 — 색을
 * 바꾸려면 감싸는 요소의 color를 바꾼다.
 */

type IconProps = {
  size?: string | number;
};

export function ChevronRight({ size = '1em' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5 L16 12 L9 19" />
    </svg>
  );
}

export function ChevronLeft({ size = '1em' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5 L8 12 L15 19" />
    </svg>
  );
}

export function ChevronDown({ size = '1em' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 9 L12 16 L19 9" />
    </svg>
  );
}

export function ChevronUp({ size = '1em' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 15 L12 8 L19 15" />
    </svg>
  );
}

export function Close({ size = '1em' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6 L18 18" />
      <path d="M18 6 L6 18" />
    </svg>
  );
}

export function Search({ size = '1em' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6" />
      <path d="M15.5 15.5 L20 20" />
    </svg>
  );
}

/** 탭바 아이콘 — 위 6종과 같은 선 스타일로 그린다 */
function Line({ size = '1em', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Home(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M4 10.5 L12 4 L20 10.5 V19 a1 1 0 0 1 -1 1 H15 V14 H9 V20 H5 a1 1 0 0 1 -1 -1 Z" />
    </Line>
  );
}

export function Calendar(props: IconProps) {
  return (
    <Line {...props}>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10 H20 M8 3 V7 M16 3 V7" />
    </Line>
  );
}

export function CheckList(props: IconProps) {
  return (
    <Line {...props}>
      <path d="M4 7 L6 9 L9.5 5.5 M4 15 L6 17 L9.5 13.5 M13 7.5 H20 M13 15.5 H20" />
    </Line>
  );
}
