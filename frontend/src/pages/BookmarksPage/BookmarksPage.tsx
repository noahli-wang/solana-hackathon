
import BrowsePage from "../BrowsePage/BrowsePage";

interface BookmarksPageProps {
  bookmarks: Set<string>;
  onBookmark: (id: string) => void;
}

export default function BookmarksPage({
  bookmarks,
  onBookmark,
}: BookmarksPageProps) {
  return (
    <BrowsePage
      bookmarks={bookmarks}
      onBookmark={onBookmark}
      bookmarksOnly
    />
  );
}
