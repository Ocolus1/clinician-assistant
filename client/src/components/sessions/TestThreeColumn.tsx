import { ThreeColumnLayout } from "./ThreeColumnLayout";

export function TestThreeColumn() {
  return (
    <ThreeColumnLayout 
      leftColumn={
        <div>
          <h3>Left Column</h3>
          <p>This is the left column content.</p>
        </div>
      }
      middleColumn={
        <div>
          <h3>Middle Column</h3>
          <p>This is the middle column content.</p>
        </div>
      }
      rightColumn={
        <div>
          <h3>Right Column</h3>
          <p>This is the right column content.</p>
        </div>
      }
    />
  );
}