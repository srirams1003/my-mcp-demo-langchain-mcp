from langchain_text_splitters import RecursiveCharacterTextSplitter

# Load example document
with open("wikipedia_page.txt") as f:
    state_of_the_union = f.read()

text_splitter = RecursiveCharacterTextSplitter(
    # Set a really small chunk size, just to show.
    chunk_size=1000,
    chunk_overlap=50,
    length_function=len,
    is_separator_regex=False,
)
texts = text_splitter.create_documents([state_of_the_union])
for i in range(len(texts)):
    print(texts[i])
    print("------------------------------------------------------------------------------------------")


