import { useWindowDimensions, View } from "react-native";
import RenderHtml, { type MixedStyleDeclaration } from "react-native-render-html";

interface RichContentProps {
  html: string;
}

// Mirrors the frontend `prose-rich` CSS from app/globals.css.
const baseStyles: Record<string, MixedStyleDeclaration> = {
  body: {
    color: "#334155",
    fontSize: 15,
    lineHeight: 24,
  },
  p: { marginVertical: 6 },
  h1: { fontSize: 22, fontWeight: "700", color: "#0f172a", marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 19, fontWeight: "700", color: "#0f172a", marginTop: 12, marginBottom: 6 },
  h3: { fontSize: 17, fontWeight: "600", color: "#0f172a", marginTop: 10, marginBottom: 4 },
  h4: { fontSize: 15, fontWeight: "600", color: "#0f172a", marginTop: 8, marginBottom: 4 },
  strong: { fontWeight: "700", color: "#0f172a" },
  b: { fontWeight: "700", color: "#0f172a" },
  em: { fontStyle: "italic" },
  i: { fontStyle: "italic" },
  ul: { marginVertical: 6, paddingLeft: 18 },
  ol: { marginVertical: 6, paddingLeft: 18 },
  li: { marginVertical: 2 },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: "#a5b4fc",
    backgroundColor: "#eef2ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginVertical: 8,
    fontStyle: "italic",
    color: "#475569",
    borderRadius: 6,
  },
  code: {
    backgroundColor: "#f1f5f9",
    color: "#be123c",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 13,
  },
  pre: {
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  a: {
    color: "#4f46e5",
    textDecorationLine: "underline",
  },
  hr: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginVertical: 12,
  },
};

export function RichContent({ html }: RichContentProps) {
  const { width } = useWindowDimensions();
  return (
    <View>
      <RenderHtml
        contentWidth={width - 48}
        source={{ html }}
        tagsStyles={baseStyles}
        defaultTextProps={{ selectable: true }}
        enableExperimentalMarginCollapsing
      />
    </View>
  );
}

export default RichContent;
