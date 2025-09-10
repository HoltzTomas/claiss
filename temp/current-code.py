from manim import *

class QuickSortAnimation(Scene):
    def construct(self):
        # Data for the array
        array_data = [8, 2, 5, 3, 9, 4, 7, 6, 1]
        
        # --- Section 1: Introduction ---
        self.next_section("Introduction")
        title = Text("Quicksort Algorithm", font_size=48)
        subtitle = Text("A divide-and-conquer sorting algorithm", font_size=24).next_to(title, DOWN, buff=0.3)
        title_group = VGroup(title, subtitle)
        self.play(Write(title_group), run_time=1)
        self.wait(1)
        self.play(FadeOut(title_group), run_time=0.5)

        # --- Section 2: Array Initialization ---
        self.next_section("Array Initialization")
        
        # Create visual representation of the array
        squares = VGroup()
        for num in array_data:
            square = Square(side_length=1.0)
            text = Text(str(num)).move_to(square.get_center())
            element = VGroup(square, text)
            squares.add(element)
        
        squares.arrange(RIGHT, buff=0.2)
        
        array_label = Text("Unsorted Array").next_to(squares, UP, buff=0.5)
        self.play(FadeIn(array_label), Create(squares), run_time=0.5)
        self.wait(0.5)
        self.play(FadeOut(array_label), run_time=0.5)
        
        # --- Section 3: Sorting Animation ---
        self.next_section("Sorting Animation")
        
        # Start the recursive quicksort animation
        self.quicksort_animation(squares, 0, len(array_data) - 1)
        
        # --- Section 4: Conclusion ---
        self.next_section("Conclusion")
        sorted_label = Text("Array is Sorted!", font_size=40).next_to(squares, UP, buff=0.5)
        self.play(Write(sorted_label), run_time=0.5)
        self.wait(1)
        self.play(FadeOut(sorted_label), FadeOut(squares), run_time=0.5)
        self.wait(0.5)

    def quicksort_animation(self, squares, low, high):
        if low < high:
            # Partition the array and get the pivot index
            pivot_index = self.partition_animation(squares, low, high)
            
            # Recursively sort the two sub-arrays
            self.quicksort_animation(squares, low, pivot_index - 1)
            self.quicksort_animation(squares, pivot_index + 1, high)

    def partition_animation(self, squares, low, high):
        pivot_element = squares[high]
        pivot_value = int(squares[high][1].text)
        
        # Highlight the pivot
        pivot_text = Text("Pivot", font_size=24).next_to(pivot_element, DOWN, buff=0.5)
        self.play(
            pivot_element[0].animate.set_fill(YELLOW, opacity=0.5),
            Write(pivot_text),
            run_time=0.5
        )
        self.wait(0.5)

        i = low - 1
        
        # Create pointers
        i_pointer = Arrow(start=UP, end=DOWN, max_tip_length_to_length_ratio=0.35, color=BLUE)
        i_text = Text("i", font_size=24).next_to(i_pointer, UP)
        i_group = VGroup(i_pointer, i_text).next_to(squares[low], UP, buff=0.1).shift(LEFT * 1.2)
        
        j_pointer = Arrow(start=UP, end=DOWN, max_tip_length_to_length_ratio=0.35, color=ORANGE)
        j_text = Text("j", font_size=24).next_to(j_pointer, UP)
        j_group = VGroup(j_pointer, j_text).next_to(squares[low], UP, buff=0.1)

        self.play(Create(i_group), Create(j_group), run_time=0.5)
        
        for j in range(low, high):
            self.play(j_group.animate.next_to(squares[j], UP, buff=0.1), run_time=0.25)
            self.wait(0.25)
            
            j_value = int(squares[j][1].text)
            
            # Highlight comparison
            self.play(squares[j][0].animate.set_fill(BLUE, opacity=0.5), run_time=0.25)
            
            if j_value < pivot_value:
                i += 1
                self.play(i_group.animate.next_to(squares[i], UP, buff=0.1), run_time=0.25)
                
                # Swap elements
                pos_i, pos_j = squares[i].get_center(), squares[j].get_center()
                self.play(
                    squares[i].animate.move_to(pos_j),
                    squares[j].animate.move_to(pos_i),
                    run_time=0.5
                )
                squares[i], squares[j] = squares[j], squares[i]
                self.wait(0.25)
            
            # Unhighlight
            self.play(squares[j][0].animate.set_fill(BLACK, opacity=0), run_time=0.25)


        # Swap pivot with element at i+1
        i += 1
        pos_pivot, pos_i1 = squares[high].get_center(), squares[i].get_center()
        self.play(
            squares[high].animate.move_to(pos_i1),
            squares[i].animate.move_to(pos_pivot),
            run_time=0.5
        )
        squares[high], squares[i] = squares[i], squares[high]
        self.wait(0.5)
        
        # Mark pivot as sorted
        self.play(
            squares[i][0].animate.set_fill(GREEN, opacity=0.7),
            FadeOut(pivot_text),
            FadeOut(i_group),
            FadeOut(j_group),
            run_time=0.5
        )
        
        return i
