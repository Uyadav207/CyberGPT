import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import useStore from "../../store/store";
import { X, Search, Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ChatSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  _id: string;
  chatId: string;
  tags?: string[];
  message: string;
  createdAt: number;
}

interface Chat {
  _id: string;
  title: string;
  createdAt: number;
}

export function ChatSearch({ isOpen, onClose }: ChatSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();
  const user = useStore((state) => state.user);

  // Get all chat history for the user
  const chatHistory = useQuery(api.chats.getChatsByUserId, user?.id ? {
    userId: String(user.id),
  } : "skip") as Chat[] | undefined;

  // Get chat messages for filtering
  const messages = useQuery(api.chats.getAllUserChatMessages, user?.id ? {
    userId: String(user.id),
  } : "skip") as ChatMessage[] | undefined;

  useEffect(() => {
    if (messages) {
      // Extract unique tags from all chat messages
      const tags = new Set<string>();
      messages.forEach((message: ChatMessage) => {
        message.tags?.forEach((tag: string) => tags.add(tag));
      });
      setAvailableTags(Array.from(tags));
    }
  }, [messages]);

  // Filter messages based on search query and selected tags
  const filteredMessages = messages?.filter((msg: ChatMessage) => {
    const matchesSearch =
      searchQuery === "" ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedTags.length === 0) return matchesSearch;
    const msgTags = new Set(msg.tags || []);
    return matchesSearch && selectedTags.some(tag => msgTags.has(tag));
  });

  // Compute chats that have at least one message with the selected tag
  const chatsWithSelectedTag = useMemo(() => {
    if (!selectedTags.length || !messages || !chatHistory) return [];
    // Find chatIds that have at least one message with the selected tag
    const chatIds = new Set(
      messages.filter(msg => msg.tags && msg.tags.some(tag => selectedTags.includes(tag)))
        .map(msg => msg.chatId)
    );
    // Return chat objects
    return chatHistory.filter(chat => chatIds.has(chat._id));
  }, [selectedTags, messages, chatHistory]);

  // Helper to get chat title by chatId
  const getChatTitle = (chatId: string) => {
    const chat = chatHistory?.find(c => c._id === chatId);
    return chat ? chat.title : "Unknown Chat";
  };

  // Helper to get chat createdAt by chatId
  const getChatCreatedAt = (chatId: string) => {
    const chat = chatHistory?.find(c => c._id === chatId);
    return chat ? chat.createdAt : undefined;
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (!isOpen) return null;

  // Helper to get first paragraph or up to 200 chars, preserving line breaks
  const getMessagePreview = (msg: string) => {
    const para = msg.split(/\n\n|\r\n\r\n/)[0];
    return para.length > 200 ? para.slice(0, 200) + "..." : para;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 20 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-2xl mx-auto"
      >
        {/* Animated tag cloud above search bar when filter is open */}
        <AnimatePresence>
          {showFilter && availableTags.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={{
                hidden: { opacity: 0, y: -10 },
                visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.04 } },
              }}
              className="flex flex-wrap gap-2 justify-center mb-4"
            >
              {availableTags.map((tag, i) => (
                <motion.div
                  key={tag}
                  variants={{
                    hidden: { opacity: 0, scale: 0.8, y: -10 },
                    visible: { opacity: 1, scale: 1, y: 0 },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Badge
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer text-base px-3 py-1 rounded-full font-medium transition-all min-w-[48px] text-center"
                    onClick={() => toggleTag(tag)}
                  >
                    {`#${tag}`}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        {/* Floating pill search bar */}
        <div className="flex items-center w-full bg-sidebar/70 shadow-lg rounded-full px-6 py-3 backdrop-blur-lg border border-sidebar-border">
          <Search className="h-5 w-5 text-muted-foreground mr-2" />
          <input
            autoFocus
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base placeholder:text-sidebar-foreground/60"
            style={{ minWidth: 0 }}
          />
          <Button
            variant={showFilter ? "default" : "ghost"}
            size="icon"
            className="ml-2"
            onClick={() => setShowFilter((v) => !v)}
            aria-label="Filter"
            type="button"
          >
            <Filter className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {/* Show filtered chats by tag below search bar if tag is selected and no search query */}
        <AnimatePresence>
          {selectedTags.length > 0 && !searchQuery.trim() && (
            <motion.ul
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 right-0 mt-4 mx-auto w-full max-w-2xl z-20 flex flex-col gap-0 max-h-[132px] overflow-y-auto scrollbar-hide"
              style={{ background: "none", boxShadow: "none", scrollSnapType: 'y mandatory' }}
            >
              {chatsWithSelectedTag.length > 0 ? chatsWithSelectedTag.map((chat, i) => (
                <motion.li
                  key={chat._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: i * 0.03, duration: 0.18 }}
                  className="flex items-start gap-2 px-4 py-2 cursor-pointer hover:bg-sidebar-accent/60 rounded-md transition-colors text-sm min-h-[44px]"
                  style={{ border: "none", background: "none", scrollSnapAlign: 'start' }}
                  onClick={() => {
                    navigate(`/chatbot/${chat._id}?tag=${encodeURIComponent(selectedTags[0])}`);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[15px] text-foreground mb-0.5">{chat.title}</div>
                    <div className="text-muted-foreground whitespace-pre-line leading-snug text-[13px]">
                      {chat.title}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5 min-w-fit">
                    {chat.createdAt ? new Date(chat.createdAt).toLocaleDateString() : ""}
                  </span>
                </motion.li>
              )) : (
                <motion.li
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-muted-foreground py-8"
                >No results found.</motion.li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
        {/* Minimalist floating list of results for search query */}
        <AnimatePresence>
          {searchQuery.trim().length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 right-0 mt-4 mx-auto w-full max-w-2xl z-20 flex flex-col gap-0 max-h-[132px] overflow-y-auto scrollbar-hide"
              style={{ background: "none", boxShadow: "none", scrollSnapType: 'y mandatory' }}
            >
              {filteredMessages && filteredMessages.length > 0 ? filteredMessages.map((msg, i) => (
                <motion.li
                  key={msg._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: i * 0.03, duration: 0.18 }}
                  className="flex items-start gap-2 px-4 py-2 cursor-pointer hover:bg-sidebar-accent/60 rounded-md transition-colors text-sm min-h-[44px]"
                  style={{ border: "none", background: "none", scrollSnapAlign: 'start' }}
                  onClick={() => {
                    navigate(`/chatbot/${msg.chatId}?messageId=${msg._id}`);
                    onClose();
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-[15px] text-foreground mb-0.5">{getChatTitle(msg.chatId)}</div>
                    <div className="text-muted-foreground whitespace-pre-line leading-snug text-[13px]">
                      {getMessagePreview(msg.message)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-0.5 min-w-fit">
                    {getChatCreatedAt(msg.chatId) ? new Date(getChatCreatedAt(msg.chatId)!).toLocaleDateString() : ""}
                  </span>
                </motion.li>
              )) : (
                <motion.li
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center text-muted-foreground py-8"
                >No results found.</motion.li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 