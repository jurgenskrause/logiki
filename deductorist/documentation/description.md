The Game Board and Dynamism
Logiki is a deductive logic puzzle based on the classic "Einstein's Riddle." The player's goal is to determine the exact locations of various items within a grid by interpreting a series of graphical clues.
Dimensions (N x M): The game is highly dynamic and scalable. The board is a grid consisting of N rows and M columns, where both N and M can be set anywhere from 3 to 8.
Rows (N): Represent distinct categories of items (e.g., faces, house numbers, fruits, street signs).
Columns (M): Represent the "houses" or physical locations on the street.
The Logic: Every item within a category row is unique. Each house (column) must contain exactly one item from every category. No two houses can share the same item.
Interaction: Players left-click an item in a house to "confirm" it (which eliminates all other items in that row for that house, and removes that item from all other houses) or right-click to "eliminate" it as a possibility.

Clue Types: Horizontal and Vertical
The clues provided at the bottom of the screen dictate the relationships between the items. They are broken down into horizontal (positional across the street) and vertical (alignment within houses) clues.
1. Horizontal Clues (Relationships across columns)
These clues define how items are placed relative to one another horizontally across the M columns.
Adjacent: Displays two items side-by-side. This means the two items are in columns immediately next to each other, but the order is unknown (it could be A-B or B-A).
Relative Position (Left/Right): Displays two items with an arrow pointing from the first to the second. This means the first item is located in a column somewhere to the left of the second item. They do not have to be adjacent.
Strict Betweenness: Displays three items horizontally (A - B - C). This means these three items occupy three immediately adjacent columns, with item B located exactly in the middle of A and C. The outer items can be reversed, so the valid layouts on the board are either A-B-C or C-B-A.
One Column Between, Not B (A !B C): This clue indicates that there is exactly one empty column separating item A and item C. Furthermore, it explicitly states that item B is not located in that middle column.
2. Vertical Clues (Relationships within columns)
These clues define which items share the same house or are mutually exclusive.
Same Column (Two Items): Displays two items stacked vertically. This indicates that both items belong in the exact same column (house).
Same Column (Three Items): Displays three items stacked vertically. This means all three of these items must be placed together in the exact same column.
Different Column: Displays two items stacked vertically with a red "X" or slash through them. This means these two items cannot share the same column.
Two Same, One Different: Displays a group of three items where two are shown to be in the same column, and the third item is explicitly shown not to be in that column. (e.g., A and B share a house, but C lives elsewhere).
Same as One of Two (OR Clue): This clue links three items (A, B, and C). It dictates that item A is in the same column as either item B OR item C, but not both. Because A can only be in one column, this inherently implies that B and C must be located in different columns from each other.

The Win State
A win state is reached when the player has successfully deduced the exact location of every item on the board.
Visual Completion: The N x M grid is entirely filled. Every column contains exactly one confirmed item from each of the N categories.
Clue Satisfaction: All horizontal and vertical clues provided at the start of the game are perfectly mathematically satisfied by the final board layout.
The Reveal: Once the final correct deduction is made and the grid is fully resolved, the game recognizes the win state.

