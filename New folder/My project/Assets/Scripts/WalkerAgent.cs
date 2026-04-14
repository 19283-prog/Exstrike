using UnityEngine;
using Unity.MLAgents;
using Unity.MLAgents.Sensors;
using Unity.MLAgents.Actuators;

public class WalkerAgent : Agent
{
    public Transform target;
    public float moveSpeed = 4f;
    public float areaSize = 8f;
    public int score = 0;

    public override void OnEpisodeBegin()
    {
        score = 0;

        transform.position = new Vector3(
            Random.Range(-areaSize, areaSize),
            1f,
            Random.Range(-areaSize, areaSize)
        );

        RandomizeTarget();
    }

    public override void CollectObservations(VectorSensor sensor)
    {
        sensor.AddObservation(transform.localPosition.x);
        sensor.AddObservation(transform.localPosition.z);
        sensor.AddObservation(target.localPosition.x);
        sensor.AddObservation(target.localPosition.z);
    }

    public override void OnActionReceived(ActionBuffers actions)
    {
        float moveX = actions.ContinuousActions[0];
        float moveZ = actions.ContinuousActions[1];

        Vector3 move = new Vector3(moveX, 0f, moveZ);
        transform.position += move * moveSpeed * Time.deltaTime;

        float distance = Vector3.Distance(transform.position, target.position);

        // tiny penalty every step so it learns speed
        AddReward(-0.001f);

        // reward for getting closer
        AddReward(0.001f * (1f / Mathf.Max(distance, 0.1f)));

        if (distance < 1.2f)
        {
            score++;
            SetReward(1.0f);
            RandomizeTarget();
        }

        // fell off map
        if (transform.position.y < -1f)
        {
            SetReward(-1f);
            EndEpisode();
        }
    }

    public override void Heuristic(in ActionBuffers actionsOut)
    {
        var actions = actionsOut.ContinuousActions;
        actions[0] = 0f;
        actions[1] = 0f;
    }

    void RandomizeTarget()
    {
        target.position = new Vector3(
            Random.Range(-areaSize, areaSize),
            0.5f,
            Random.Range(-areaSize, areaSize)
        );
    }
}