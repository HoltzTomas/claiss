from manim import *

class BubbleSortAnimation(Scene):
    def construct(self):
        # Values to sort
        values = [6, 3, 8, 5, 2]
        
        # Create rectangles with values
        rects = [Square().set_fill(BLUE, opacity=0.5).set_height(1.5) for _ in values]
        values_text = [Text(str(value)) for value in values]
        
        # Arrange rectangles with values
        for rect, text, x_position in zip(rects, values_text, range(-2, 3)):
            rect.next_to(x_position * RIGHT, UP)
            text.move_to(rect.get_center())
        
        self.add(*rects, *values_text)
        self.wait(1)
        
        # Bubble Sort Animation
        n = len(values)
        for i in range(n):
            swapped = False
            for j in range(0, n - i - 1):
                if values[j] > values[j + 1]:
                    swapped = True
                    # Swap values in the list
                    values[j], values[j + 1] = values[j + 1], values[j]
                    
                    # Swap rectangles and text visually
                    rects[j], rects[j + 1] = rects[j + 1], rects[j]
                    values_text[j], values_text[j + 1] = values_text[j + 1], values_text[j]
                    
                    self.play(
                        rects[j].animate.move_to((j * 2 - (n-1)) * RIGHT + UP),
                        rects[j + 1].animate.move_to((j * 2 + 2 - (n-1)) * RIGHT + UP),
                        values_text[j].animate.move_to(rects[j].get_center()),
                        values_text[j + 1].animate.move_to(rects[j + 1].get_center()),
                        run_time=0.5
                    )
            
            if not swapped:
                break
        
        self.wait(1)